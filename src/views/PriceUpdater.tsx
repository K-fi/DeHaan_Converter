'use client';

import { useState, useRef } from 'react';
import Stepper from '../components/Stepper';
import FileUploadCard from '../components/FileUploadCard';
import PreviewTable from '../components/PreviewTable';
import Banner from '../components/Banner';
import SheetPicker from '../components/SheetPicker';
import Tooltip from '../components/Tooltip';
import { useLang } from '../context/LangContext';
import { findBestCol, EAN_HINTS, PRICE_HINTS, CODE_HINTS, DESC_HINTS, UNIT_HINTS, CURR_HINTS } from '../utils/columns';
import { normalizeEan, looksLikeEan, fmtDate } from '../utils/matching';
import { sheetTo2D, downloadXLSX, downloadCSV } from '../utils/xlsx';
import { detectHeaderRow, parseFromHeaderRow } from '../utils/headers';
import PresetBar from '../components/PresetBar';
import type {
  ParsedFile, BannerInfo, MatchResults, MatchArgs, AutoDetected, DupeOccurrence, ReportRow,
  Preset, PriceUpdaterMappings,
} from '../types';

type SheetCache = Record<string, { cols: string[]; data: Record<string, unknown>[] }>;

export default function PriceUpdater() {
  const { lang, t } = useLang();

  const [step, setStep] = useState(1);
  const [exactFile, setExactFile] = useState<ParsedFile | null>(null);
  const [supplFile, setSupplFile] = useState<ParsedFile | null>(null);

  const [exactEan,        setExactEan]        = useState('');
  const [exactCode,       setExactCode]       = useState('');
  const [exactPrice,      setExactPrice]      = useState('');
  const [supplEan,        setSupplEan]        = useState('');
  const [supplExtraEans,  setSupplExtraEans]  = useState<string[]>([]);
  const [showExtraEan,    setShowExtraEan]    = useState(false);
  const [extraEanSearch,  setExtraEanSearch]  = useState('');
  const [supplCode,       setSupplCode]       = useState('');
  const [supplPrice,      setSupplPrice]      = useState('');

  const [exactEanSheet,   setExactEanSheet]   = useState('');
  const [exactCodeSheet,  setExactCodeSheet]  = useState('');
  const [exactPriceSheet, setExactPriceSheet] = useState('');
  const [supplEanSheet,   setSupplEanSheet]   = useState('');
  const [supplCodeSheet,  setSupplCodeSheet]  = useState('');
  const [supplPriceSheet, setSupplPriceSheet] = useState('');

  const [priceType,      setPriceType]      = useState('inkoop');
  const [activeFrom,     setActiveFrom]     = useState('');
  const [activeTo,       setActiveTo]       = useState('');
  const [exactColBanner, setExactColBanner] = useState<BannerInfo | null>(null);
  const [supplColBanner, setSupplColBanner] = useState<BannerInfo | null>(null);
  const [results,        setResults]        = useState<MatchResults | null>(null);
  const [dupeSelections, setDupeSelections] = useState<Record<string, number>>({});
  const [processing,          setProcessing]         = useState(false);
  const [processingProgress,  setProcessingProgress] = useState(0);
  const [downloading,         setDownloading]        = useState(false);
  const [presetBanner,   setPresetBanner]   = useState<BannerInfo | null>(null);
  const [fieldErrors,    setFieldErrors]    = useState<Record<string, boolean>>({});

  const autoDetRef        = useRef<AutoDetected>({});
  const allOccurrencesRef = useRef<Record<string, DupeOccurrence[]>>({});
  const supplByEanRef     = useRef<Record<string, unknown>>({});
  const supplByCodeRef    = useRef<Record<string, unknown>>({});
  const matchArgsRef      = useRef<MatchArgs | null>(null);
  const matchSheetArgsRef = useRef<{ eEanSheet: string; eCodeSheet: string; ePriceSheet: string } | null>(null);
  const nullEanRowsRef    = useRef<Record<string, unknown>[]>([]);
  const exactHeaderColRef = useRef('');
  const exactSheetsRef    = useRef<SheetCache>({});
  const supplSheetsRef    = useRef<SheetCache>({});

  // ── Sheet helpers ────────────────────────────────────────

  function getOrParse(workbook: ParsedFile['workbook'], sheetName: string, cache: SheetCache, primaryData: Record<string, unknown>[], primaryCols: string[], primarySheet: string) {
    if (!sheetName || sheetName === primarySheet) return { cols: primaryCols, data: primaryData };
    if (cache[sheetName]) return cache[sheetName];
    const ws = workbook.Sheets[sheetName];
    if (!ws) return { cols: [], data: [] };
    const rows = sheetTo2D(ws);
    const hIdx = detectHeaderRow(rows);
    const parsed = parseFromHeaderRow(rows, hIdx);
    cache[sheetName] = parsed;
    return parsed;
  }

  function getExactSheet(sn: string) { return getOrParse(exactFile!.workbook, sn, exactSheetsRef.current, exactFile!.data, exactFile!.cols, exactFile!.workbook.SheetNames[0]); }
  function getSupplSheet(sn: string) { return getOrParse(supplFile!.workbook, sn, supplSheetsRef.current, supplFile!.data, supplFile!.cols, supplFile!.workbook.SheetNames[0]); }

  // ── Navigation ──────────────────────────────────────────

  function enterStep2() {
    const pe = exactFile!.workbook.SheetNames[0];
    const ps = supplFile!.workbook.SheetNames[0];
    exactSheetsRef.current = {}; supplSheetsRef.current = {};

    const { cols: eCols, data: eData } = exactFile!;
    const { cols: sCols, data: sData } = supplFile!;

    const eEan   = findBestCol(eCols, eData, EAN_HINTS, looksLikeEan);
    const eCode  = findBestCol(eCols, eData, CODE_HINTS, null);
    const ePrice = findBestCol(eCols, eData, PRICE_HINTS, null);
    const sEan   = findBestCol(sCols, sData, EAN_HINTS, looksLikeEan);
    const sCode  = findBestCol(sCols, sData, CODE_HINTS, null);
    const sPrice = findBestCol(sCols, sData, PRICE_HINTS, null);

    autoDetRef.current = { eEan, eCode, ePrice, sEan, sCode, sPrice };

    setExactEan(eEan || eCols[0] || '');
    setExactCode(eCode || '');
    setExactPrice(ePrice || eCols[0] || '');
    setSupplEan(sEan || sCols[0] || '');
    setSupplCode(sCode || '');
    setSupplPrice(sPrice || sCols[0] || '');
    setSupplExtraEans([]); setShowExtraEan(false);

    setExactEanSheet(pe); setExactCodeSheet(pe); setExactPriceSheet(pe);
    setSupplEanSheet(ps); setSupplCodeSheet(ps); setSupplPriceSheet(ps);

    const eOk = !!(eEan && ePrice);
    setExactColBanner({ type: eOk ? 'success' : 'warning', icon: eOk ? '✓' : '⚠', message: t(eOk ? 'puAutoDet' : 'puAutoDetFail') });
    const sOk = !!(sEan && sPrice);
    setSupplColBanner({ type: sOk ? 'success' : 'warning', icon: sOk ? '✓' : '⚠', message: t(sOk ? 'puAutoDet' : 'puAutoDetFail') });

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Processing ──────────────────────────────────────────

  async function processFiles() {
    const errs: Record<string, boolean> = {};
    if (!exactEan)   errs.exactEan   = true;
    if (!exactPrice) errs.exactPrice = true;
    if (!supplEan)   errs.supplEan   = true;
    if (!supplPrice) errs.supplPrice = true;
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); alert(lang === 'nl' ? 'Selecteer alle verplichte kolommen (gemarkeerd met *).' : 'Please select all required columns (marked with *).'); return; }
    setFieldErrors({});

    // Capture all values synchronously before going async (avoids stale closure issues)
    exactHeaderColRef.current = exactFile!.cols.find(c => c.toLowerCase() === 'header') ?? '';
    const supplEanData    = getSupplSheet(supplEanSheet).data;
    const supplCodeData   = supplCode ? getSupplSheet(supplCodeSheet).data : [];
    const supplPriceData  = getSupplSheet(supplPriceSheet).data;
    const sRowCount       = supplFile!.data.length;
    const capSupplEan     = supplEan;
    const capSupplCode    = supplCode;
    const capSupplExtra   = supplExtraEans;
    const capSupplPrice   = supplPrice;
    const capExactEan     = exactEan;
    const capExactCode    = exactCode;
    const capExactPrice   = exactPrice;
    const capExactEanSh   = exactEanSheet;
    const capExactCodeSh  = exactCodeSheet;
    const capExactPriceSh = exactPriceSheet;
    const capActiveFrom   = activeFrom;
    const capActiveTo     = activeTo;

    setProcessing(true);
    setProcessingProgress(0);
    await new Promise<void>(r => setTimeout(r, 30));

    try {
      const CHUNK = 5000;

      // ── Phase 1: Build supplier lookup maps (0 → 50%) ──────
      const newAllOccurrences: Record<string, DupeOccurrence[]> = {};
      const newSupplByCode: Record<string, unknown> = {};
      const newNullEanRows: Record<string, unknown>[] = [];

      for (let i = 0; i < sRowCount; i += CHUNK) {
        const end = Math.min(i + CHUNK, sRowCount);
        for (let rowIdx = i; rowIdx < end; rowIdx++) {
          const code = capSupplCode ? String(supplCodeData[rowIdx]?.[capSupplCode] ?? '').trim() : '';
          const rowEans: Record<string, boolean> = {};
          const e = normalizeEan(supplEanData[rowIdx]?.[capSupplEan] ?? '');
          if (e) rowEans[e] = true;
          capSupplExtra.forEach(col => { const e2 = normalizeEan(supplEanData[rowIdx]?.[col] ?? ''); if (e2) rowEans[e2] = true; });
          const priceVal = supplPriceData[rowIdx]?.[capSupplPrice];
          const baseRow  = supplEanData[rowIdx] ?? {};
          if (Object.keys(rowEans).length === 0) newNullEanRows.push(baseRow);
          Object.keys(rowEans).forEach(ean => {
            if (!newAllOccurrences[ean]) newAllOccurrences[ean] = [];
            newAllOccurrences[ean].push({ price: priceVal, row: baseRow });
          });
          if (code && !newSupplByCode[code]) newSupplByCode[code] = priceVal;
        }
        setProcessingProgress(Math.round((end / sRowCount) * 50));
        await new Promise<void>(r => setTimeout(r, 0));
      }

      nullEanRowsRef.current = newNullEanRows;

      const newSupplByEan: Record<string, unknown> = {};
      const newDupeSelections: Record<string, number> = {};
      Object.keys(newAllOccurrences).forEach(ean => {
        const occs = newAllOccurrences[ean];
        if (occs.length > 1) newDupeSelections[ean] = 0;
        newSupplByEan[ean] = occs[0].price;
      });

      allOccurrencesRef.current = newAllOccurrences;
      supplByEanRef.current     = newSupplByEan;
      supplByCodeRef.current    = newSupplByCode;
      matchArgsRef.current      = { eEanCol: capExactEan, eCodeCol: capExactCode, ePriceCol: capExactPrice, fromValue: capActiveFrom, toValue: capActiveTo };
      matchSheetArgsRef.current = { eEanSheet: capExactEanSh, eCodeSheet: capExactCodeSh, ePriceSheet: capExactPriceSh };

      // ── Phase 2: Match Exact rows (50 → 100%) ──────────────
      const exactEanData   = getExactSheet(capExactEanSh).data;
      const exactCodeData  = capExactCode ? getExactSheet(capExactCodeSh).data : [];
      const exactPriceData = getExactSheet(capExactPriceSh).data;
      const eRowCount      = exactFile!.data.length;

      const dupeEanSet = new Set(Object.entries(newAllOccurrences).filter(([, o]) => o.length > 1).map(([ean]) => ean));
      const dupesList: [string, number][] = [...dupeEanSet].map(ean => [ean, newAllOccurrences[ean].length]);

      const resultData: Record<string, unknown>[] = [];
      const reportRows: ReportRow[] = [];
      const unmatched: MatchResults['unmatched'] = [];
      const nullEanExactList: Record<string, unknown>[] = [];
      const usedDupeEans = new Set<string>();
      let updated = 0;

      for (let i = 0; i < eRowCount; i += CHUNK) {
        const end = Math.min(i + CHUNK, eRowCount);
        for (let rowIdx = i; rowIdx < end; rowIdx++) {
          const primaryRow = exactFile!.data[rowIdx];
          const copy: Record<string, unknown> = { ...primaryRow };
          const ean  = normalizeEan(exactEanData[rowIdx]?.[capExactEan] ?? '');
          const code = capExactCode ? String(exactCodeData[rowIdx]?.[capExactCode] ?? '').trim() : '';
          const oldPrice = exactPriceData[rowIdx]?.[capExactPrice];

          if (!ean) nullEanExactList.push(primaryRow);
          let newPrice: unknown;
          let matchedBy = '';

          if (ean && Object.prototype.hasOwnProperty.call(newSupplByEan, ean)) {
            newPrice = newSupplByEan[ean]; matchedBy = 'EAN';
            if (dupeEanSet.has(ean)) usedDupeEans.add(ean);
          } else if (code && Object.prototype.hasOwnProperty.call(newSupplByCode, code)) {
            newPrice = newSupplByCode[code]; matchedBy = 'Article code (fallback)';
          }

          if (newPrice !== undefined) {
            copy[capExactPrice] = newPrice; updated++;
            if (capActiveFrom) copy['Active from'] = fmtDate(capActiveFrom);
            if (capActiveTo)   copy['Active to']   = fmtDate(capActiveTo);
            reportRows.push({ EAN: ean, ArticleCode: code, OldPrice: oldPrice, NewPrice: newPrice, ActiveFrom: capActiveFrom || '', ActiveTo: capActiveTo || '', Status: 'Updated', MatchedBy: matchedBy });
          } else {
            unmatched.push({ ean, code, oldPrice, exactRow: primaryRow });
            reportRows.push({ EAN: ean, ArticleCode: code, OldPrice: oldPrice, NewPrice: '', ActiveFrom: '', ActiveTo: '', Status: 'Not matched', MatchedBy: '' });
          }
          resultData.push(copy);
        }
        setProcessingProgress(50 + Math.round((end / eRowCount) * 50));
        await new Promise<void>(r => setTimeout(r, 0));
      }

      const resultColSet = new Set(exactFile!.cols);
      resultData.forEach(row => { Object.keys(row).forEach(k => resultColSet.add(k)); });
      const resultCols = [...resultColSet];

      const dupeData: Record<string, unknown>[] = [];
      dupesList.forEach(([ean, count]) => { newAllOccurrences[ean].forEach(occ => { dupeData.push({ EAN: ean, 'Total occurrences': count, ...occ.row }); }); });

      const oldPriceCol = `Before: ${capExactPrice}`;
      const resultPreviewCols = [...resultCols];
      const priceIdx = resultPreviewCols.indexOf(capExactPrice);
      if (priceIdx !== -1) resultPreviewCols.splice(priceIdx, 0, oldPriceCol);
      else resultPreviewCols.unshift(oldPriceCol);
      const resultPreviewData = resultData.reduce<Record<string, unknown>[]>((acc, row, i) => {
        if (reportRows[i]?.Status === 'Updated') acc.push({ ...row, [oldPriceCol]: reportRows[i].OldPrice });
        return acc;
      }, []);

      setDupeSelections(newDupeSelections);
      setResults({ updated, total: eRowCount, resultData, resultCols, reportRows, unmatched, dupeData, dupesList, usedDupeEans: [...usedDupeEans], nullEanData: nullEanRowsRef.current, nullEanExactData: nullEanExactList, resultPreviewCols, resultPreviewData });
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setProcessing(false);
      setProcessingProgress(0);
    }
  }

  function computeMatching(supplByEan: Record<string, unknown>, supplByCode: Record<string, unknown>): MatchResults {
    const { eEanCol, eCodeCol, ePriceCol, fromValue, toValue } = matchArgsRef.current!;
    const { eEanSheet, eCodeSheet, ePriceSheet } = matchSheetArgsRef.current!;
    const allOccurrences = allOccurrencesRef.current;

    const exactEanData   = getExactSheet(eEanSheet).data;
    const exactCodeData  = eCodeCol ? getExactSheet(eCodeSheet).data : [];
    const exactPriceData = getExactSheet(ePriceSheet).data;

    const dupeEanSet = new Set(Object.entries(allOccurrences).filter(([, o]) => o.length > 1).map(([ean]) => ean));
    const dupesList: [string, number][] = [...dupeEanSet].map(ean => [ean, allOccurrences[ean].length]);

    let updated = 0;
    const usedDupeEans = new Set<string>();
    const reportRows: ReportRow[] = [];
    const unmatched: MatchResults['unmatched'] = [];
    const nullEanExactList: Record<string, unknown>[] = [];

    const resultData = exactFile!.data.map((primaryRow, rowIdx) => {
      const copy: Record<string, unknown> = { ...primaryRow };
      const ean  = normalizeEan(exactEanData[rowIdx]?.[eEanCol] ?? '');
      const code = eCodeCol ? String(exactCodeData[rowIdx]?.[eCodeCol] ?? '').trim() : '';
      const oldPrice = exactPriceData[rowIdx]?.[ePriceCol];

      if (!ean) nullEanExactList.push(primaryRow);
      let newPrice: unknown;
      let matchedBy = '';

      if (ean && Object.prototype.hasOwnProperty.call(supplByEan, ean)) {
        newPrice = supplByEan[ean]; matchedBy = 'EAN';
        if (dupeEanSet.has(ean)) usedDupeEans.add(ean);
      } else if (code && Object.prototype.hasOwnProperty.call(supplByCode, code)) {
        newPrice = supplByCode[code]; matchedBy = 'Article code (fallback)';
      }

      if (newPrice !== undefined) {
        copy[ePriceCol] = newPrice; updated++;
        if (fromValue) copy['Active from'] = fmtDate(fromValue);
        if (toValue)   copy['Active to']   = fmtDate(toValue);
        reportRows.push({ EAN: ean, ArticleCode: code, OldPrice: oldPrice, NewPrice: newPrice, ActiveFrom: fromValue || '', ActiveTo: toValue || '', Status: 'Updated', MatchedBy: matchedBy });
      } else {
        unmatched.push({ ean, code, oldPrice, exactRow: primaryRow });
        reportRows.push({ EAN: ean, ArticleCode: code, OldPrice: oldPrice, NewPrice: '', ActiveFrom: '', ActiveTo: '', Status: 'Not matched', MatchedBy: '' });
      }
      return copy;
    });

    // O(n) column dedup using Set instead of O(n²) Array.includes
    const resultColSet = new Set(exactFile!.cols);
    resultData.forEach(row => { Object.keys(row).forEach(k => resultColSet.add(k)); });
    const resultCols = [...resultColSet];

    const dupeData: Record<string, unknown>[] = [];
    dupesList.forEach(([ean, count]) => { allOccurrences[ean].forEach(occ => { dupeData.push({ EAN: ean, 'Total occurrences': count, ...occ.row }); }); });

    const oldPriceCol = `Before: ${ePriceCol}`;
    const resultPreviewCols = [...resultCols];
    const priceIdx = resultPreviewCols.indexOf(ePriceCol);
    if (priceIdx !== -1) resultPreviewCols.splice(priceIdx, 0, oldPriceCol);
    else resultPreviewCols.unshift(oldPriceCol);
    const resultPreviewData = resultData.reduce<Record<string, unknown>[]>((acc, row, i) => {
      if (reportRows[i]?.Status === 'Updated') acc.push({ ...row, [oldPriceCol]: reportRows[i].OldPrice });
      return acc;
    }, []);

    return { updated, total: exactFile!.data.length, resultData, resultCols, reportRows, unmatched, dupeData, dupesList, usedDupeEans: [...usedDupeEans], nullEanData: nullEanRowsRef.current, nullEanExactData: nullEanExactList, resultPreviewCols, resultPreviewData };
  }

  function reapplyDupeSelections() {
    try {
      const newSupplByEan: Record<string, unknown> = {};
      Object.keys(allOccurrencesRef.current).forEach(ean => {
        const occs = allOccurrencesRef.current[ean];
        if (occs?.length) newSupplByEan[ean] = occs[Math.min(dupeSelections[ean] ?? 0, occs.length - 1)].price;
      });
      supplByEanRef.current = newSupplByEan;
      setResults(computeMatching(newSupplByEan, supplByCodeRef.current));
    } catch { /* state already set — UI stays on last valid results */ }
  }

  // ── Downloads ────────────────────────────────────────────

  function withDownload(fn: () => void) {
    setDownloading(true);
    setTimeout(() => {
      try { fn(); } finally { setDownloading(false); }
    }, 30);
  }

  function downloadFile() {
    withDownload(() => {
      const name = exactFile!.fileName.replace(/\.(xlsx?|xlsm|xlsb|ods|csv|tsv|txt)$/i, '_updated.xlsx');
      const headerCol = exactHeaderColRef.current;
      const data = headerCol ? results!.resultData.filter(row => String(row[headerCol] ?? '').trim() === 'H') : results!.resultData;
      downloadXLSX(data, results!.resultCols, name);
    });
  }

  function downloadReport()   { withDownload(() => downloadCSV(results!.reportRows, 'price_update_report.csv')); }
  function downloadDupes()    { withDownload(() => downloadXLSX(results!.dupeData, Object.keys(results!.dupeData[0] || {}), 'duplicate_eans.xlsx', 'Duplicates')); }
  function downloadNullEans() { withDownload(() => { if (!results!.nullEanData.length) return; downloadXLSX(results!.nullEanData, Object.keys(results!.nullEanData[0] || {}), 'supplier_missing_ean.xlsx', 'Missing EAN'); }); }
  function downloadNullEansExact() { withDownload(() => { if (!results!.nullEanExactData.length) return; downloadXLSX(results!.nullEanExactData, Object.keys(results!.nullEanExactData[0] || {}), 'exact_missing_ean.xlsx', 'Missing EAN'); }); }

  function downloadUnmatched() {
    withDownload(() => {
      if (!results!.unmatched.length) return;
      const { eEanCol, eCodeCol } = matchArgsRef.current!;
      const unmatchedData: Record<string, string>[] = results!.unmatched.map(u => {
        const exactRow = u.exactRow || {};
        let descCol = '', unitCol = '', currCol = '';
        Object.keys(exactRow).forEach(k => {
          const n = k.toLowerCase();
          if (!descCol && DESC_HINTS.some(h => n.includes(h))) descCol = k;
          if (!unitCol && UNIT_HINTS.some(h => n.includes(h))) unitCol = k;
          if (!currCol && CURR_HINTS.some(h => n.includes(h))) currCol = k;
        });
        return {
          'Header': '',
          'Item code': eCodeCol && exactRow[eCodeCol] ? String(exactRow[eCodeCol]).trim() : '',
          'Item descri': descCol && exactRow[descCol] ? String(exactRow[descCol]).trim() : '',
          'Purchase u': unitCol && exactRow[unitCol] ? String(exactRow[unitCol]).trim() : '',
          'Purchase u Currency': currCol && exactRow[currCol] ? String(exactRow[currCol]).trim() : 'EUR',
          'Barcode': eEanCol && exactRow[eEanCol] ? String(exactRow[eEanCol]).trim() : '',
          'status artikel': 'Vervallen',
        };
      });
      downloadXLSX(unmatchedData, ['Header', 'Item code', 'Item descri', 'Purchase u', 'Purchase u Currency', 'Barcode', 'status artikel'], 'unmatched_products.xlsx', 'Unmatched');
    });
  }

  // ── Presets ──────────────────────────────────────────────

  function getMappings(): Record<string, unknown> {
    return {
      exactEan, exactCode, exactPrice,
      exactEanSheet, exactCodeSheet, exactPriceSheet,
      supplEan, supplExtraEans, supplCode, supplPrice,
      supplEanSheet, supplCodeSheet, supplPriceSheet,
      priceType,
    };
  }

  function applyPreset(preset: Preset) {
    setFieldErrors({});
    const m = preset.mappings as unknown as PriceUpdaterMappings;

    // Eagerly parse ALL sheets so column lookup is complete
    const eSheets = exactFile!.workbook.SheetNames;
    const sSheets = supplFile!.workbook.SheetNames;
    const eAllCols = new Set<string>(exactFile!.cols);
    eSheets.forEach(sn => getExactSheet(sn).cols.forEach(c => eAllCols.add(c)));
    const sAllCols = new Set<string>(supplFile!.cols);
    sSheets.forEach(sn => getSupplSheet(sn).cols.forEach(c => sAllCols.add(c)));

    const checked: string[] = [];
    const missing: string[] = [];

    // Validate sheet exists in current workbook before applying it
    function validSheet(sheet: string, available: string[]): string {
      return available.includes(sheet) ? sheet : available[0];
    }

    function tryExact(col: string, sheet: string, setCol: (v: string) => void, setSheet: (v: string) => void) {
      if (!col) return;
      checked.push(col);
      if (eAllCols.has(col)) { setCol(col); setSheet(validSheet(sheet, eSheets)); }
      else missing.push(col);
    }
    function trySuppl(col: string, sheet: string, setCol: (v: string) => void, setSheet: (v: string) => void) {
      if (!col) return;
      checked.push(col);
      if (sAllCols.has(col)) { setCol(col); setSheet(validSheet(sheet, sSheets)); }
      else missing.push(col);
    }

    tryExact(m.exactEan ?? '', m.exactEanSheet ?? '', setExactEan, setExactEanSheet);
    tryExact(m.exactCode ?? '', m.exactCodeSheet ?? '', setExactCode, setExactCodeSheet);
    tryExact(m.exactPrice ?? '', m.exactPriceSheet ?? '', setExactPrice, setExactPriceSheet);
    trySuppl(m.supplEan ?? '', m.supplEanSheet ?? '', setSupplEan, setSupplEanSheet);
    trySuppl(m.supplCode ?? '', m.supplCodeSheet ?? '', setSupplCode, setSupplCodeSheet);
    trySuppl(m.supplPrice ?? '', m.supplPriceSheet ?? '', setSupplPrice, setSupplPriceSheet);

    if (m.supplExtraEans?.length) {
      const valid = m.supplExtraEans.filter((c: string) => { checked.push(c); if (sAllCols.has(c)) return true; missing.push(c); return false; });
      setSupplExtraEans(valid);
      setShowExtraEan(valid.length > 0);
    } else {
      setSupplExtraEans([]); setShowExtraEan(false);
    }
    if (m.priceType) setPriceType(m.priceType);

    const matchCount = checked.length - missing.length;
    const matchRate = checked.length > 0 ? matchCount / checked.length : 1;
    const name = `<strong>${preset.name}</strong>`;
    setPresetBanner(
      missing.length === 0
        ? { type: 'success', icon: '✓', message: lang === 'nl' ? `Preset ${name} geladen — alle ${checked.length} kolommen gevonden.` : `Preset ${name} loaded — all ${checked.length} columns matched.` }
        : matchRate >= 0.5
          ? { type: 'warning', icon: '⚠', message: lang === 'nl' ? `Preset ${name} gedeeltelijk geladen — ${matchCount}/${checked.length} kolommen gevonden. Niet gevonden: ${missing.join(', ')}.` : `Preset ${name} partially loaded — ${matchCount}/${checked.length} columns matched. Missing: ${missing.join(', ')}.` }
          : { type: 'warning', icon: '✗', message: lang === 'nl' ? `Preset ${name} lijkt niet te passen bij dit bestand (${matchCount}/${checked.length} kolommen gevonden). Gebruikt u de juiste preset?` : `Preset ${name} doesn't seem to match this file (${matchCount}/${checked.length} columns found). Are you using the right preset?` }
    );
  }

  // ── Render ───────────────────────────────────────────────

  const ad = autoDetRef.current;
  const exactSheetNames = exactFile?.workbook.SheetNames ?? [];
  const supplSheetNames = supplFile?.workbook.SheetNames ?? [];

  const STEPS = [
    { num: 1, label: t('puStep1') },
    { num: 2, label: t('puStep2') },
    { num: 3, label: t('puStep3') },
  ];

  return (
    <div className="container">
      <header>
        <h1>{t('puTitle')}</h1>
        <p>{t('puDesc')}</p>
      </header>

      <Stepper step={step} onStepClick={setStep} steps={STEPS} />

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <>
          <div className="grid-2">
            <FileUploadCard title={t('puExactFileTitle')} icon="📄" onFileLoaded={setExactFile} initialFile={exactFile} />
            <FileUploadCard title={t('puSupplFileTitle')} icon="📋" onFileLoaded={setSupplFile} initialFile={supplFile} />
          </div>
          <div className="actions">
            <button className="btn btn-primary" disabled={!exactFile || !supplFile} onClick={enterStep2}>{t('btnContinue')}</button>
          </div>
        </>
      )}

      {/* ── Step 2: Column mapping ── */}
      {step === 2 && exactFile && supplFile && (
        <>
          <PresetBar tool="price_updater" getMappings={getMappings} onLoad={applyPreset} />
          {presetBanner && <Banner {...presetBanner} />}

          {/* Exact mapping */}
          <div className="card">
            <div className="card-title">{t('puExactCardTitle')}</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: '0.75rem', marginTop: '-0.25rem' }}>{t('puExactCardDesc')}</p>
            {exactColBanner && <Banner {...exactColBanner} />}
            {exactSheetNames.length > 1 && (
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>{t('puMultiSheetNote')}</p>
            )}
            <div className="grid-3" style={{ marginTop: '1rem' }}>
              <div>
                <label className="field-label">
                  {t('puEanCol')} *<Tooltip text={t('ttExactEan')} />
                </label>
                <select value={exactEan} className={exactEan && exactEan === ad.eEan ? 'auto-detected' : exactEan ? '' : 'needs-review'} style={fieldErrors.exactEan ? { border: '1.5px solid var(--red-text)' } : undefined} onChange={e => { setExactEan(e.target.value); setFieldErrors(p => ({ ...p, exactEan: false })); }}>
                  {getExactSheet(exactEanSheet).cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <SheetPicker sheetNames={exactSheetNames} value={exactEanSheet} onChange={s => { setExactEanSheet(s); setExactEan(getExactSheet(s).cols[0] ?? ''); }} />
              </div>
              <div>
                <label className="field-label">
                  {t('puArticleCode')}<Tooltip text={t('ttExactCode')} />
                </label>
                <select value={exactCode} className={exactCode && exactCode === ad.eCode ? 'auto-detected' : ''} onChange={e => setExactCode(e.target.value)}>
                  <option value="">— none —</option>
                  {getExactSheet(exactCodeSheet).cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <SheetPicker sheetNames={exactSheetNames} value={exactCodeSheet} onChange={s => { setExactCodeSheet(s); setExactCode(''); }} />
              </div>
              <div>
                <label className="field-label">
                  {t('puPriceColUpdate')} *<Tooltip text={t('ttExactPrice')} />
                </label>
                <select value={exactPrice} className={exactPrice && exactPrice === ad.ePrice ? 'auto-detected' : exactPrice ? '' : 'needs-review'} style={fieldErrors.exactPrice ? { border: '1.5px solid var(--red-text)' } : undefined} onChange={e => { setExactPrice(e.target.value); setFieldErrors(p => ({ ...p, exactPrice: false })); }}>
                  {getExactSheet(exactPriceSheet).cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <SheetPicker sheetNames={exactSheetNames} value={exactPriceSheet} onChange={s => { setExactPriceSheet(s); setExactPrice(getExactSheet(s).cols[0] ?? ''); }} />
              </div>
            </div>
            <hr className="divider" />
            <label className="field-label">{t('puPriceType')}<Tooltip text={t('ttPriceType')} /></label>
            <div className="radio-group">
              <div className={`radio-btn${priceType === 'inkoop' ? ' selected' : ''}`} onClick={() => setPriceType('inkoop')}>{t('puInkoop')}</div>
              <div className={`radio-btn${priceType === 'verkoop' ? ' selected' : ''}`} onClick={() => setPriceType('verkoop')}>{t('puVerkoop')}</div>
            </div>
          </div>

          {/* Supplier mapping */}
          <div className="card">
            <div className="card-title">{t('puSupplCardTitle')}</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: '0.75rem', marginTop: '-0.25rem' }}>{t('puSupplCardDesc')}</p>
            {supplColBanner && <Banner {...supplColBanner} />}
            {supplSheetNames.length > 1 && (
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>{t('puMultiSheetNote')}</p>
            )}
            <div className="grid-3" style={{ marginTop: '1rem' }}>
              <div>
                <label className="field-label">
                  {t('puEanCol')} *<Tooltip text={t('ttSupplEan')} />
                </label>
                <select value={supplEan} className={supplEan && supplEan === ad.sEan ? 'auto-detected' : supplEan ? '' : 'needs-review'} style={fieldErrors.supplEan ? { border: '1.5px solid var(--red-text)' } : undefined} onChange={e => { setSupplEan(e.target.value); setFieldErrors(p => ({ ...p, supplEan: false })); }}>
                  {getSupplSheet(supplEanSheet).cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <SheetPicker sheetNames={supplSheetNames} value={supplEanSheet} onChange={s => { setSupplEanSheet(s); setSupplEan(getSupplSheet(s).cols[0] ?? ''); setSupplExtraEans([]); }} />
                <div style={{ marginTop: 6 }}>
                  <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => { setShowExtraEan(v => !v); setExtraEanSearch(''); }}>
                    {showExtraEan ? t('puRemoveEan') : t('puAddEan')}
                  </button>
                </div>
                {showExtraEan && (() => {
                  const eanCols = getSupplSheet(supplEanSheet).cols;
                  const filtered = extraEanSearch.trim() ? eanCols.filter(c => c.toLowerCase().includes(extraEanSearch.toLowerCase())) : eanCols;
                  const allChecked = filtered.length > 0 && filtered.every(c => supplExtraEans.includes(c));
                  return (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('puExtraEanNote')}</div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={extraEanSearch}
                          onChange={e => setExtraEanSearch(e.target.value)}
                          placeholder="Search columns…"
                          style={{ flex: 1, fontSize: 12, padding: '4px 8px', border: '0.5px solid var(--border-md)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }}
                        />
                        {filtered.length > 0 && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0, userSelect: 'none' }}>
                            <input
                              type="checkbox"
                              checked={allChecked}
                              onChange={() => {
                                if (allChecked) setSupplExtraEans(prev => prev.filter(c => !filtered.includes(c)));
                                else setSupplExtraEans(prev => [...new Set([...prev, ...filtered.filter(c => c !== supplEan)])]);
                              }}
                            />
                            All
                          </label>
                        )}
                      </div>
                      <div className="ean-check-list">
                        {filtered.length === 0
                          ? <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>No columns match "{extraEanSearch}"</span>
                          : filtered.map(col => (
                          <label key={col}>
                            <input type="checkbox" checked={supplExtraEans.includes(col)} onChange={e => setSupplExtraEans(prev => e.target.checked ? [...prev, col] : prev.filter(c => c !== col))} />
                            <span>{col}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div>
                <label className="field-label">
                  {t('puArticleCode')}<Tooltip text={t('ttSupplCode')} />
                </label>
                <select value={supplCode} className={supplCode && supplCode === ad.sCode ? 'auto-detected' : ''} onChange={e => setSupplCode(e.target.value)}>
                  <option value="">— none —</option>
                  {getSupplSheet(supplCodeSheet).cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <SheetPicker sheetNames={supplSheetNames} value={supplCodeSheet} onChange={s => { setSupplCodeSheet(s); setSupplCode(''); }} />
              </div>
              <div>
                <label className="field-label">
                  {t('puNewPriceCol')} *<Tooltip text={t('ttSupplPrice')} />
                </label>
                <select value={supplPrice} className={supplPrice && supplPrice === ad.sPrice ? 'auto-detected' : supplPrice ? '' : 'needs-review'} style={fieldErrors.supplPrice ? { border: '1.5px solid var(--red-text)' } : undefined} onChange={e => { setSupplPrice(e.target.value); setFieldErrors(p => ({ ...p, supplPrice: false })); }}>
                  {getSupplSheet(supplPriceSheet).cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <SheetPicker sheetNames={supplSheetNames} value={supplPriceSheet} onChange={s => { setSupplPriceSheet(s); setSupplPrice(getSupplSheet(s).cols[0] ?? ''); }} />
              </div>
            </div>
          </div>

          {/* Active dates */}
          <div className="card">
            <div className="card-title">{t('puDatesCardTitle')}</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: '1rem', marginTop: '-0.25rem' }}>{t('puDatesCardDesc')}</p>
            <div className="grid-2">
              <div>
                <label className="field-label">{t('puActiveFrom')}<Tooltip text={t('ttActiveFrom')} /></label>
                <input type="date" value={activeFrom} onChange={e => setActiveFrom(e.target.value)} />
                <p className="field-hint">{t('puActiveFromHint')}</p>
              </div>
              <div>
                <label className="field-label">{t('puActiveTo')}<Tooltip text={t('ttActiveTo')} /></label>
                <input type="date" value={activeTo} onChange={e => setActiveTo(e.target.value)} />
                <p className="field-hint">{t('puActiveToHint')}</p>
              </div>
            </div>
          </div>

          <div className="actions">
            <button className="btn" disabled={processing} onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t('btnBack')}</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'stretch', flex: 1, maxWidth: 220 }}>
              <button className="btn btn-primary" disabled={processing} onClick={processFiles}>
                {processing ? `${lang === 'nl' ? 'Verwerken' : 'Processing'}… ${processingProgress > 0 ? processingProgress + '%' : ''}` : t('puProcess')}
              </button>
              {processing && (
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${processingProgress}%`, background: 'var(--btn-primary-bg)', transition: 'width 0.15s ease' }} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Step 3: Results ── */}
      {step === 3 && results && (
        <>
          <div className="card">
            <div className="card-title">{t('puResultsCardTitle')}</div>
            <div style={{ marginBottom: '1rem' }}>
              <span className="summary-chip">{t('puPriceTypeChip')}: {priceType === 'inkoop' ? t('puPurchaseChip') : t('puSellingChip')}</span>
              {activeFrom && <span className="summary-chip">{t('puActiveFromChip')}: {activeFrom}</span>}
              {activeTo   && <span className="summary-chip">{t('puActiveToChip')}: {activeTo}</span>}
            </div>
            <div className="metrics">
              <div className="metric green"><div className="metric-val">{results.updated}</div><div className="metric-lbl"><span>{t('puMetricUpdated')}</span><Tooltip text={t('ttMetricUpdated')} /></div></div>
              <div className="metric"><div className="metric-val">{results.total}</div><div className="metric-lbl"><span>{t('puMetricTotal')}</span><Tooltip text={t('ttMetricTotal')} /></div></div>
              <div className="metric amber"><div className="metric-val">{results.unmatched.length}</div><div className="metric-lbl"><span>{t('puMetricUnmatched')}</span><Tooltip text={t('ttUnmatched')} /></div></div>
              <div className="metric amber"><div className="metric-val">{results.dupesList.length}</div><div className="metric-lbl"><span>{t('puMetricDupes')}</span><Tooltip text={t('ttDupes')} /></div></div>
              <div className="metric amber"><div className="metric-val">{results.nullEanData.length}</div><div className="metric-lbl"><span>{t('puMetricNullSuppl')}</span><Tooltip text={t('ttNullSuppl')} /></div></div>
              <div className="metric amber"><div className="metric-val">{results.nullEanExactData.length}</div><div className="metric-lbl"><span>{t('puMetricNullExact')}</span><Tooltip text={t('ttNullExact')} /></div></div>
            </div>

            {/* Unmatched */}
            {results.unmatched.length > 0 && (
              <div className="table-section">
                <div className="table-section-title" style={{ display: 'flex', alignItems: 'center' }}>{t('puUnmatchedTitle')}<Tooltip text={t('ttUnmatched')} /></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{t('puColEan')}</th><th>{t('puColArticle')}</th><th>{t('puColCurrentPrice')}</th><th>{t('puColStatus')}</th></tr></thead>
                    <tbody>
                      {results.unmatched.map((u, i) => (
                        <tr key={i}>
                          <td>{u.ean || '—'}</td><td>{u.code || '—'}</td>
                          <td>{u.oldPrice !== '' ? String(u.oldPrice) : '—'}</td>
                          <td><span className="badge badge-amber">{t('puBadgeNotMatched')}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 8 }}><button className="btn btn-sm" disabled={downloading} onClick={downloadUnmatched}>{t('puDlUnmatched')}</button></div>
              </div>
            )}

            {/* Duplicates */}
            {results.dupesList.length > 0 && (
              <div className="table-section">
                <div className="table-section-title" style={{ display: 'flex', alignItems: 'center' }}>{t('puDupesTitle')}<Tooltip text={t('ttDupes')} /></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{t('puColEan')}</th><th>{t('puColOccurrences')}</th><th>{t('puColAllPrices')}</th><th>{t('puColUsedUpdate')}</th><th>{t('puColPriceInUse')}</th></tr></thead>
                    <tbody>
                      {results.dupesList.slice(0, 5).map(([ean, count]) => {
                        const occs = allOccurrencesRef.current[ean] || [];
                        const prices = occs.map(o => String(o.price));
                        const uniquePrices = [...new Set(prices)];
                        const allSame = uniquePrices.length === 1;
                        const isUsed = results.usedDupeEans.includes(ean);
                        return (
                          <tr key={ean}>
                            <td>{ean}</td><td>{count}</td>
                            <td>{uniquePrices.slice(0, 3).join(' · ')}{uniquePrices.length > 3 ? ' · …' : ''}</td>
                            <td><span className={`badge ${isUsed ? 'badge-green' : 'badge-amber'}`}>{isUsed ? t('puBadgeUpdated') : t('puBadgeNotMatched')}</span></td>
                            <td>
                              {!isUsed ? '—' : allSame ? uniquePrices[0] : (
                                <select value={dupeSelections[ean] ?? 0} onChange={e => setDupeSelections(prev => ({ ...prev, [ean]: parseInt(e.target.value, 10) }))} style={{ fontSize: 11, padding: '2px 6px', border: '0.5px solid var(--border-md)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)' }}>
                                  {occs.map((o, i) => <option key={i} value={i}>{String(o.price)} ({t('puOccurrence')} {i + 1})</option>)}
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {results.dupesList.length > 5 && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {lang === 'nl' ? `5 van ${results.dupesList.length} dubbele EANs getoond — download voor alle.` : `Showing 5 of ${results.dupesList.length} duplicate EANs — download to see all.`}
                  </div>
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-sm" disabled={downloading} onClick={reapplyDupeSelections}>{t('puReapplyDupes')}</button>
                  <button className="btn btn-sm" disabled={downloading} onClick={downloadDupes}>{t('puDlDupes')}</button>
                </div>
              </div>
            )}

            {/* Missing EAN — supplier */}
            {results.nullEanData.length > 0 && (
              <div className="table-section">
                <div className="table-section-title" style={{ display: 'flex', alignItems: 'center' }}>{t('puNullSupplTitle')}<Tooltip text={t('ttNullSuppl')} /></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{t('puColNum')}</th>{supplCode && <th>{t('puColArticle')}</th>}{supplPrice && <th>{t('puColPrice')}</th>}<th>{t('puColStatus')}</th></tr></thead>
                    <tbody>
                      {results.nullEanData.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          <td style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                          {supplCode  && <td>{row[supplCode]  !== undefined ? String(row[supplCode])  : '—'}</td>}
                          {supplPrice && <td>{row[supplPrice] !== undefined ? String(row[supplPrice]) : '—'}</td>}
                          <td><span className="badge badge-amber">{t('puBadgeNoEan')}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {results.nullEanData.length > 5 && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {lang === 'nl' ? `5 van ${results.nullEanData.length} regels met ontbrekende EAN getoond — download voor alle.` : `Showing 5 of ${results.nullEanData.length} rows with missing EAN — download to see all.`}
                  </div>
                )}
                <div style={{ marginTop: 8 }}><button className="btn btn-sm" disabled={downloading} onClick={downloadNullEans}>{t('puDlNullEan')}</button></div>
              </div>
            )}

            {/* Missing EAN — Exact */}
            {results.nullEanExactData.length > 0 && (
              <div className="table-section">
                <div className="table-section-title" style={{ display: 'flex', alignItems: 'center' }}>{t('puNullExactTitle')}<Tooltip text={t('ttNullExact')} /></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>{t('puColNum')}</th>{exactCode && <th>{t('puColArticle')}</th>}<th>{t('puColCurrentPrice')}</th><th>{t('puColStatus')}</th></tr></thead>
                    <tbody>
                      {results.nullEanExactData.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          <td style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                          {exactCode && <td>{row[exactCode] !== undefined ? String(row[exactCode]) : '—'}</td>}
                          <td>{exactPrice && row[exactPrice] !== undefined ? String(row[exactPrice]) : '—'}</td>
                          <td><span className="badge badge-amber">{t('puBadgeNoEan')}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {results.nullEanExactData.length > 5 && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {lang === 'nl' ? `5 van ${results.nullEanExactData.length} regels met ontbrekende EAN getoond — download voor alle.` : `Showing 5 of ${results.nullEanExactData.length} rows with missing EAN — download to see all.`}
                  </div>
                )}
                <div style={{ marginTop: 8 }}><button className="btn btn-sm" disabled={downloading} onClick={downloadNullEansExact}>{t('puDlNullEan')}</button></div>
              </div>
            )}
          </div>

          {/* Updated file preview */}
          <div className="card">
            <div className="card-title">{t('puPreviewCardTitle')}</div>
            {results.updated === 0 ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                {lang === 'nl' ? 'Geen prijzen bijgewerkt — niets om te tonen.' : 'No prices were updated — nothing to preview.'}
              </div>
            ) : (
              <>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {exactHeaderColRef.current
                    ? (lang === 'nl'
                        ? `Eerste bijgewerkte rijen waar ${exactHeaderColRef.current} = H — gebruik de pijlen om door alle kolommen te bladeren.`
                        : `First updated rows where ${exactHeaderColRef.current} = H — use the arrows to page through all columns.`)
                    : (lang === 'nl'
                        ? 'Eerste 5 bijgewerkte rijen — gebruik de pijlen om door alle kolommen te bladeren.'
                        : 'First 5 updated rows — use the arrows to page through all columns.')}
                </p>
                <PreviewTable
                  cols={results.resultPreviewCols}
                  data={exactHeaderColRef.current
                    ? results.resultPreviewData.filter(row => String(row[exactHeaderColRef.current] ?? '').trim() === 'H')
                    : results.resultPreviewData}
                />
              </>
            )}
          </div>

          {exactHeaderColRef.current && (() => {
            const filtered = results.resultData.filter(row => String(row[exactHeaderColRef.current] ?? '').trim() === 'H');
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--green-text)', fontWeight: 500 }}>{t('puHeaderFilterActive')}</span>
                <span>
                  {lang === 'nl'
                    ? <>Download bevat alleen rijen waar <strong>{exactHeaderColRef.current} = H</strong> — {filtered.length} van {results.resultData.length} rijen.</>
                    : <>Download will contain only rows where <strong>{exactHeaderColRef.current} = H</strong> — {filtered.length} of {results.resultData.length} rows.</>}
                </span>
              </div>
            );
          })()}

          <div className="actions">
            <button className="btn" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t('btnBack')}</button>
            <button className="btn" disabled={downloading} onClick={downloadReport}>{t('puDlReport')}</button>
            <button className="btn btn-download" disabled={downloading} onClick={downloadFile}>
              {downloading ? (lang === 'nl' ? 'Downloaden…' : 'Downloading…') : t('puDlFile')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
