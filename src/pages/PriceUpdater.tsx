import { useState, useRef } from 'react';
import Stepper from '../components/Stepper';
import FileUploadCard from '../components/FileUploadCard';
import PreviewTable from '../components/PreviewTable';
import Banner from '../components/Banner';
import SheetPicker from '../components/SheetPicker';
import { findBestCol, EAN_HINTS, PRICE_HINTS, CODE_HINTS, DESC_HINTS, UNIT_HINTS, CURR_HINTS } from '../utils/columns';
import { normalizeEan, looksLikeEan, fmtDate } from '../utils/matching';
import { sheetTo2D, downloadXLSX, downloadCSV } from '../utils/xlsx';
import { detectHeaderRow, parseFromHeaderRow } from '../utils/headers';
import type {
  ParsedFile,
  BannerInfo,
  MatchResults,
  MatchArgs,
  AutoDetected,
  DupeOccurrence,
  ReportRow,
} from '../types';

type SheetCache = Record<string, { cols: string[]; data: Record<string, unknown>[] }>;

export default function PriceUpdater() {
  const [step, setStep] = useState(1);

  const [exactFile, setExactFile] = useState<ParsedFile | null>(null);
  const [supplFile, setSupplFile] = useState<ParsedFile | null>(null);

  // Column selections
  const [exactEan,   setExactEan]   = useState('');
  const [exactCode,  setExactCode]  = useState('');
  const [exactPrice, setExactPrice] = useState('');
  const [supplEan,   setSupplEan]   = useState('');
  const [supplExtraEans, setSupplExtraEans] = useState<string[]>([]);
  const [showExtraEan, setShowExtraEan] = useState(false);
  const [supplCode,  setSupplCode]  = useState('');
  const [supplPrice, setSupplPrice] = useState('');

  // Sheet selections (default to primary sheet after file load)
  const [exactEanSheet,   setExactEanSheet]   = useState('');
  const [exactCodeSheet,  setExactCodeSheet]  = useState('');
  const [exactPriceSheet, setExactPriceSheet] = useState('');
  const [supplEanSheet,   setSupplEanSheet]   = useState('');
  const [supplCodeSheet,  setSupplCodeSheet]  = useState('');
  const [supplPriceSheet, setSupplPriceSheet] = useState('');

  const [priceType,  setPriceType]  = useState('inkoop');
  const [activeFrom, setActiveFrom] = useState('');
  const [activeTo,   setActiveTo]   = useState('');
  const [exactColBanner, setExactColBanner] = useState<BannerInfo | null>(null);
  const [supplColBanner, setSupplColBanner] = useState<BannerInfo | null>(null);

  const [results,        setResults]        = useState<MatchResults | null>(null);
  const [dupeSelections, setDupeSelections] = useState<Record<string, number>>({});

  const autoDetRef          = useRef<AutoDetected>({});
  const allOccurrencesRef   = useRef<Record<string, DupeOccurrence[]>>({});
  const supplByEanRef       = useRef<Record<string, unknown>>({});
  const supplByCodeRef      = useRef<Record<string, unknown>>({});
  const matchArgsRef        = useRef<MatchArgs | null>(null);
  const matchSheetArgsRef   = useRef<{ eEanSheet: string; eCodeSheet: string; ePriceSheet: string } | null>(null);

  const exactSheetsRef = useRef<SheetCache>({});
  const supplSheetsRef = useRef<SheetCache>({});

  // ── Sheet helpers ────────────────────────────────────────

  function getOrParse(
    workbook: ParsedFile['workbook'],
    sheetName: string,
    cache: SheetCache,
    primaryData: Record<string, unknown>[],
    primaryCols: string[],
    primarySheet: string,
  ): { cols: string[]; data: Record<string, unknown>[] } {
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

  function getExactSheet(sheetName: string) {
    return getOrParse(
      exactFile!.workbook, sheetName, exactSheetsRef.current,
      exactFile!.data, exactFile!.cols, exactFile!.workbook.SheetNames[0],
    );
  }

  function getSupplSheet(sheetName: string) {
    return getOrParse(
      supplFile!.workbook, sheetName, supplSheetsRef.current,
      supplFile!.data, supplFile!.cols, supplFile!.workbook.SheetNames[0],
    );
  }

  // ── Navigation ──────────────────────────────────────────

  function enterStep2() {
    const pe = exactFile!.workbook.SheetNames[0];
    const ps = supplFile!.workbook.SheetNames[0];

    exactSheetsRef.current = {};
    supplSheetsRef.current = {};

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
    setSupplExtraEans([]);
    setShowExtraEan(false);

    setExactEanSheet(pe);
    setExactCodeSheet(pe);
    setExactPriceSheet(pe);
    setSupplEanSheet(ps);
    setSupplCodeSheet(ps);
    setSupplPriceSheet(ps);

    const eOk = !!(eEan && ePrice);
    setExactColBanner({
      type: eOk ? 'success' : 'warning',
      icon: eOk ? '✓' : '⚠',
      message: eOk
        ? 'EAN and price columns auto-detected. Please verify below.'
        : 'Could not detect all columns — please select manually.',
    });
    const sOk = !!(sEan && sPrice);
    setSupplColBanner({
      type: sOk ? 'success' : 'warning',
      icon: sOk ? '✓' : '⚠',
      message: sOk
        ? 'EAN and price columns auto-detected. Please verify below.'
        : 'Could not detect all columns — please select manually.',
    });

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Processing ──────────────────────────────────────────

  function processFiles() {
    if (!exactEan || !exactPrice || !supplEan || !supplPrice) {
      alert('Please select all required columns (marked with *).');
      return;
    }

    const supplEanData   = getSupplSheet(supplEanSheet).data;
    const supplCodeData  = supplCode ? getSupplSheet(supplCodeSheet).data : [];
    const supplPriceData = getSupplSheet(supplPriceSheet).data;
    const rowCount = supplFile!.data.length;

    const newAllOccurrences: Record<string, DupeOccurrence[]> = {};
    const newSupplByCode: Record<string, unknown> = {};

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const code = supplCode ? String(supplCodeData[rowIdx]?.[supplCode] ?? '').trim() : '';
      const rowEans: Record<string, boolean> = {};

      const e = normalizeEan(supplEanData[rowIdx]?.[supplEan] ?? '');
      if (e) rowEans[e] = true;

      supplExtraEans.forEach(col => {
        const e2 = normalizeEan(supplEanData[rowIdx]?.[col] ?? '');
        if (e2) rowEans[e2] = true;
      });

      const priceVal = supplPriceData[rowIdx]?.[supplPrice];
      const baseRow = supplEanData[rowIdx] ?? {};

      Object.keys(rowEans).forEach(ean => {
        if (!newAllOccurrences[ean]) newAllOccurrences[ean] = [];
        newAllOccurrences[ean].push({ price: priceVal, row: baseRow });
      });
      if (code && !newSupplByCode[code]) newSupplByCode[code] = priceVal;
    }

    const newSupplByEan: Record<string, unknown> = {};
    const newDupeSelections: Record<string, number> = {};
    Object.keys(newAllOccurrences).forEach(ean => {
      const occs = newAllOccurrences[ean];
      if (occs.length > 1) newDupeSelections[ean] = 0;
      newSupplByEan[ean] = occs[0].price;
    });

    allOccurrencesRef.current  = newAllOccurrences;
    supplByEanRef.current      = newSupplByEan;
    supplByCodeRef.current     = newSupplByCode;
    matchArgsRef.current       = { eEanCol: exactEan, eCodeCol: exactCode, ePriceCol: exactPrice, fromValue: activeFrom, toValue: activeTo };
    matchSheetArgsRef.current  = { eEanSheet: exactEanSheet, eCodeSheet: exactCodeSheet, ePriceSheet: exactPriceSheet };

    setDupeSelections(newDupeSelections);
    setResults(computeMatching(newSupplByEan, newSupplByCode));
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function computeMatching(
    supplByEan: Record<string, unknown>,
    supplByCode: Record<string, unknown>,
  ): MatchResults {
    const { eEanCol, eCodeCol, ePriceCol, fromValue, toValue } = matchArgsRef.current!;
    const { eEanSheet, eCodeSheet, ePriceSheet } = matchSheetArgsRef.current!;
    const allOccurrences = allOccurrencesRef.current;

    const exactEanData   = getExactSheet(eEanSheet).data;
    const exactCodeData  = eCodeCol ? getExactSheet(eCodeSheet).data : [];
    const exactPriceData = getExactSheet(ePriceSheet).data;

    const dupeEanSet = new Set(
      Object.entries(allOccurrences).filter(([, o]) => o.length > 1).map(([ean]) => ean)
    );
    const dupesList: [string, number][] = [...dupeEanSet].map(ean => [ean, allOccurrences[ean].length]);

    let updated = 0;
    const usedDupeEans = new Set<string>();
    const reportRows: ReportRow[] = [];
    const unmatched: MatchResults['unmatched'] = [];

    const resultData = exactFile!.data.map((primaryRow, rowIdx) => {
      const copy: Record<string, unknown> = { ...primaryRow };
      const ean  = normalizeEan(exactEanData[rowIdx]?.[eEanCol] ?? '');
      const code = eCodeCol ? String(exactCodeData[rowIdx]?.[eCodeCol] ?? '').trim() : '';
      const oldPrice = exactPriceData[rowIdx]?.[ePriceCol];
      let newPrice: unknown;
      let matchedBy = '';

      if (ean && Object.prototype.hasOwnProperty.call(supplByEan, ean)) {
        newPrice = supplByEan[ean];
        matchedBy = 'EAN';
        if (dupeEanSet.has(ean)) usedDupeEans.add(ean);
      } else if (code && Object.prototype.hasOwnProperty.call(supplByCode, code)) {
        newPrice = supplByCode[code];
        matchedBy = 'Article code (fallback)';
      }

      if (newPrice !== undefined) {
        copy[ePriceCol] = newPrice;
        updated++;
        if (fromValue) copy['Active from'] = fmtDate(fromValue);
        if (toValue) copy['Active to'] = fmtDate(toValue);
        reportRows.push({ EAN: ean, ArticleCode: code, OldPrice: oldPrice, NewPrice: newPrice, ActiveFrom: fromValue || '', ActiveTo: toValue || '', Status: 'Updated', MatchedBy: matchedBy });
      } else {
        unmatched.push({ ean, code, oldPrice, exactRow: primaryRow });
        reportRows.push({ EAN: ean, ArticleCode: code, OldPrice: oldPrice, NewPrice: '', ActiveFrom: '', ActiveTo: '', Status: 'Not matched', MatchedBy: '' });
      }
      return copy;
    });

    const resultCols = [...exactFile!.cols];
    resultData.forEach(row => {
      Object.keys(row).forEach(k => { if (!resultCols.includes(k)) resultCols.push(k); });
    });

    const dupeData: Record<string, unknown>[] = [];
    dupesList.forEach(([ean, count]) => {
      allOccurrences[ean].forEach(occ => {
        dupeData.push({ EAN: ean, 'Total occurrences': count, ...occ.row });
      });
    });

    const oldPriceCol = `Before: ${ePriceCol}`;
    const resultPreviewCols = [...resultCols];
    const priceIdx = resultPreviewCols.indexOf(ePriceCol);
    if (priceIdx !== -1) resultPreviewCols.splice(priceIdx, 0, oldPriceCol);
    else resultPreviewCols.unshift(oldPriceCol);
    const resultPreviewData = resultData.reduce<Record<string, unknown>[]>((acc, row, i) => {
      if (reportRows[i]?.Status === 'Updated') {
        acc.push({ ...row, [oldPriceCol]: reportRows[i].OldPrice });
      }
      return acc;
    }, []);

    return {
      updated,
      total: exactFile!.data.length,
      resultData,
      resultCols,
      reportRows,
      unmatched,
      dupeData,
      dupesList,
      usedDupeEans: [...usedDupeEans],
      resultPreviewCols,
      resultPreviewData,
    };
  }

  function reapplyDupeSelections() {
    const newSupplByEan: Record<string, unknown> = {};
    Object.keys(allOccurrencesRef.current).forEach(ean => {
      const occs = allOccurrencesRef.current[ean];
      const idx = dupeSelections[ean] ?? 0;
      newSupplByEan[ean] = occs[Math.min(idx, occs.length - 1)].price;
    });
    supplByEanRef.current = newSupplByEan;
    setResults(computeMatching(newSupplByEan, supplByCodeRef.current));
  }

  // ── Downloads ──────────────────────────────────────────

  function downloadFile() {
    const name = exactFile!.fileName.replace(/\.(xlsx?|xlsm|xlsb|ods|csv|tsv|txt)$/i, '_updated.xlsx');
    downloadXLSX(results!.resultData, results!.resultCols, name);
  }

  function downloadReport() {
    downloadCSV(results!.reportRows, 'price_update_report.csv');
  }

  function downloadDupes() {
    downloadXLSX(results!.dupeData, Object.keys(results!.dupeData[0] || {}), 'duplicate_eans.xlsx', 'Duplicates');
  }

  function downloadUnmatched() {
    if (!results!.unmatched.length) { alert('No unmatched products to download.'); return; }
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
    downloadXLSX(
      unmatchedData,
      ['Header', 'Item code', 'Item descri', 'Purchase u', 'Purchase u Currency', 'Barcode', 'status artikel'],
      'unmatched_products.xlsx',
      'Unmatched'
    );
  }

  // ── Render ──────────────────────────────────────────────

  const ad = autoDetRef.current;
  const exactSheetNames = exactFile?.workbook.SheetNames ?? [];
  const supplSheetNames = supplFile?.workbook.SheetNames ?? [];

  return (
    <div className="container">
      <header>
        <h1>Exact Online — Price Updater</h1>
        <p>Automatically detects headers even when titles or empty rows appear above the data. Supports .xlsx, .xls, .xlsm, .ods, .csv, .tsv.</p>
      </header>

      <Stepper step={step} onStepClick={setStep} />

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <>
          <div className="grid-2">
            <FileUploadCard
              title="Exact Online export file"
              icon="📄"
              onFileLoaded={setExactFile}
            />
            <FileUploadCard
              title="Supplier price list"
              icon="📋"
              onFileLoaded={setSupplFile}
            />
          </div>
          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={!exactFile || !supplFile}
              onClick={enterStep2}
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {/* ── Step 2: Column mapping ── */}
      {step === 2 && exactFile && supplFile && (
        <>
          {/* Exact mapping */}
          <div className="card">
            <div className="card-title">Exact Online file — column mapping</div>
            {exactColBanner && <Banner {...exactColBanner} />}
            {exactSheetNames.length > 1 && (
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>
                Multiple sheets detected — use the small sheet selector above each dropdown to pick from a different sheet.
              </p>
            )}
            <div className="grid-3" style={{ marginTop: '1rem' }}>
              <div>
                <label className="field-label">EAN / barcode column *</label>
                <SheetPicker
                  sheetNames={exactSheetNames}
                  value={exactEanSheet}
                  onChange={s => { setExactEanSheet(s); setExactEan(getExactSheet(s).cols[0] ?? ''); }}
                />
                <select
                  value={exactEan}
                  className={exactEan && exactEan === ad.eEan ? 'auto-detected' : exactEan ? '' : 'needs-review'}
                  onChange={(e) => setExactEan(e.target.value)}
                >
                  {getExactSheet(exactEanSheet).cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Article code (optional fallback)</label>
                <SheetPicker
                  sheetNames={exactSheetNames}
                  value={exactCodeSheet}
                  onChange={s => { setExactCodeSheet(s); setExactCode(''); }}
                />
                <select
                  value={exactCode}
                  className={exactCode && exactCode === ad.eCode ? 'auto-detected' : ''}
                  onChange={(e) => setExactCode(e.target.value)}
                >
                  <option value="">— none —</option>
                  {getExactSheet(exactCodeSheet).cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Price column to update *</label>
                <SheetPicker
                  sheetNames={exactSheetNames}
                  value={exactPriceSheet}
                  onChange={s => { setExactPriceSheet(s); setExactPrice(getExactSheet(s).cols[0] ?? ''); }}
                />
                <select
                  value={exactPrice}
                  className={exactPrice && exactPrice === ad.ePrice ? 'auto-detected' : exactPrice ? '' : 'needs-review'}
                  onChange={(e) => setExactPrice(e.target.value)}
                >
                  {getExactSheet(exactPriceSheet).cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <hr className="divider" />
            <label className="field-label">Price type</label>
            <div className="radio-group">
              <div
                className={`radio-btn${priceType === 'inkoop' ? ' selected' : ''}`}
                onClick={() => setPriceType('inkoop')}
              >
                Purchase price (inkoopprijs)
              </div>
              <div
                className={`radio-btn${priceType === 'verkoop' ? ' selected' : ''}`}
                onClick={() => setPriceType('verkoop')}
              >
                Selling price (verkoopprijs)
              </div>
            </div>
          </div>

          {/* Supplier mapping */}
          <div className="card">
            <div className="card-title">Supplier file — column mapping</div>
            {supplColBanner && <Banner {...supplColBanner} />}
            {supplSheetNames.length > 1 && (
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>
                Multiple sheets detected — use the small sheet selector above each dropdown to pick from a different sheet.
              </p>
            )}
            <div className="grid-3" style={{ marginTop: '1rem' }}>
              <div>
                <label className="field-label">EAN / barcode column *</label>
                <SheetPicker
                  sheetNames={supplSheetNames}
                  value={supplEanSheet}
                  onChange={s => { setSupplEanSheet(s); setSupplEan(getSupplSheet(s).cols[0] ?? ''); setSupplExtraEans([]); }}
                />
                <select
                  value={supplEan}
                  className={supplEan && supplEan === ad.sEan ? 'auto-detected' : supplEan ? '' : 'needs-review'}
                  onChange={(e) => setSupplEan(e.target.value)}
                >
                  {getSupplSheet(supplEanSheet).cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{ marginTop: 6 }}>
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: 11 }}
                    onClick={() => setShowExtraEan(v => !v)}
                  >
                    {showExtraEan ? '－ Remove extra EAN columns' : '＋ Add more EAN columns'}
                  </button>
                </div>
                {showExtraEan && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Additional EAN columns to also search (from same sheet)
                    </div>
                    <div className="ean-check-list">
                      {getSupplSheet(supplEanSheet).cols.map(col => (
                        <label key={col}>
                          <input
                            type="checkbox"
                            checked={supplExtraEans.includes(col)}
                            onChange={(e) => {
                              setSupplExtraEans(prev =>
                                e.target.checked ? [...prev, col] : prev.filter(c => c !== col)
                              );
                            }}
                          />
                          <span>{col}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="field-label">Article code (optional fallback)</label>
                <SheetPicker
                  sheetNames={supplSheetNames}
                  value={supplCodeSheet}
                  onChange={s => { setSupplCodeSheet(s); setSupplCode(''); }}
                />
                <select
                  value={supplCode}
                  className={supplCode && supplCode === ad.sCode ? 'auto-detected' : ''}
                  onChange={(e) => setSupplCode(e.target.value)}
                >
                  <option value="">— none —</option>
                  {getSupplSheet(supplCodeSheet).cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">New price column *</label>
                <SheetPicker
                  sheetNames={supplSheetNames}
                  value={supplPriceSheet}
                  onChange={s => { setSupplPriceSheet(s); setSupplPrice(getSupplSheet(s).cols[0] ?? ''); }}
                />
                <select
                  value={supplPrice}
                  className={supplPrice && supplPrice === ad.sPrice ? 'auto-detected' : supplPrice ? '' : 'needs-review'}
                  onChange={(e) => setSupplPrice(e.target.value)}
                >
                  {getSupplSheet(supplPriceSheet).cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Active dates */}
          <div className="card">
            <div className="card-title">Active dates (optional)</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Leave blank to skip. Filled dates are written into every updated row.
            </p>
            <div className="grid-2">
              <div>
                <label className="field-label">Active from</label>
                <input type="date" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} />
                <p className="field-hint">Date from which the new price becomes active.</p>
              </div>
              <div>
                <label className="field-label">Active to</label>
                <input type="date" value={activeTo} onChange={(e) => setActiveTo(e.target.value)} />
                <p className="field-hint">Date until the price is valid. Leave blank for indefinite.</p>
              </div>
            </div>
          </div>

          <div className="actions">
            <button className="btn" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>← Back</button>
            <button className="btn btn-primary" onClick={processFiles}>Process files →</button>
          </div>
        </>
      )}

      {/* ── Step 3: Results ── */}
      {step === 3 && results && (
        <>
          {/* Processing report */}
          <div className="card">
            <div className="card-title">Processing report</div>
            <div style={{ marginBottom: '1rem' }}>
              <span className="summary-chip">
                Price type: {priceType === 'inkoop' ? 'Purchase (inkoop)' : 'Selling (verkoop)'}
              </span>
              {activeFrom && <span className="summary-chip">Active from: {activeFrom}</span>}
              {activeTo && <span className="summary-chip">Active to: {activeTo}</span>}
            </div>
            <div className="metrics">
              <div className="metric green">
                <div className="metric-val">{results.updated}</div>
                <div className="metric-lbl">prices updated</div>
              </div>
              <div className="metric">
                <div className="metric-val">{results.total}</div>
                <div className="metric-lbl">exact rows total</div>
              </div>
              <div className="metric amber">
                <div className="metric-val">{results.unmatched.length}</div>
                <div className="metric-lbl">unmatched EANs</div>
              </div>
              <div className="metric amber">
                <div className="metric-val">{results.dupesList.length}</div>
                <div className="metric-lbl">duplicate EANs</div>
              </div>
            </div>

            {/* Unmatched table */}
            {results.unmatched.length > 0 && (
              <div className="table-section">
                <div className="table-section-title">Unmatched products — EAN not found in supplier file</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>EAN</th><th>Article code</th><th>Current price</th><th>Status</th></tr></thead>
                    <tbody>
                      {results.unmatched.map((u, i) => (
                        <tr key={i}>
                          <td>{u.ean || '—'}</td>
                          <td>{u.code || '—'}</td>
                          <td>{u.oldPrice !== '' ? String(u.oldPrice) : '—'}</td>
                          <td><span className="badge badge-amber">Not matched</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-sm" onClick={downloadUnmatched}>⬇ Download unmatched (.xlsx)</button>
                </div>
              </div>
            )}

            {/* Duplicates table */}
            {results.dupesList.length > 0 && (
              <div className="table-section">
                <div className="table-section-title">Duplicate EANs in supplier file</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>EAN</th><th>Occurrences</th><th>All different prices</th><th>Used for update</th><th>Price in use</th></tr>
                    </thead>
                    <tbody>
                      {results.dupesList.slice(0, 5).map(([ean, count]) => {
                        const occs = allOccurrencesRef.current[ean] || [];
                        const prices = occs.map(o => String(o.price));
                        const uniquePrices = [...new Set(prices)];
                        const allSame = uniquePrices.length === 1;
                        const isUsed = results.usedDupeEans.includes(ean);
                        return (
                          <tr key={ean}>
                            <td>{ean}</td>
                            <td>{count}</td>
                            <td>{uniquePrices.slice(0, 3).join(' · ')}{uniquePrices.length > 3 ? ' · …' : ''}</td>
                            <td>
                              <span className={`badge ${isUsed ? 'badge-green' : 'badge-amber'}`}>
                                {isUsed ? 'Updated' : 'Not matched'}
                              </span>
                            </td>
                            <td>
                              {!isUsed ? '—' : allSame ? uniquePrices[0] : (
                                <select
                                  value={dupeSelections[ean] ?? 0}
                                  onChange={(e) => {
                                    const idx = parseInt(e.target.value, 10);
                                    setDupeSelections(prev => ({ ...prev, [ean]: idx }));
                                  }}
                                  style={{ fontSize: 11, padding: '2px 6px', border: '0.5px solid var(--border-md)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)' }}
                                >
                                  {occs.map((o, i) => (
                                    <option key={i} value={i}>{String(o.price)} (occurrence {i + 1})</option>
                                  ))}
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
                    Showing 5 of {results.dupesList.length} duplicate EANs — download to see all.
                  </div>
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-sm" onClick={reapplyDupeSelections}>↻ Reapply price selections</button>
                  <button className="btn btn-sm" onClick={downloadDupes}>⬇ Download duplicates (.xlsx)</button>
                </div>
              </div>
            )}
          </div>

          {/* Updated file preview */}
          <div className="card">
            <div className="card-title">Updated file preview</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              First 5 updated rows — use the arrows to page through all columns.
            </p>
            <PreviewTable cols={results.resultPreviewCols} data={results.resultPreviewData} />
          </div>

          <div className="actions">
            <button className="btn" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>← Back</button>
            <button className="btn" onClick={downloadReport}>⬇ Download report (.csv)</button>
            <button className="btn btn-download" onClick={downloadFile}>⬇ Download updated file (.xlsx)</button>
          </div>
        </>
      )}
    </div>
  );
}
