import { useState, useRef, useMemo, useCallback, memo, useEffect } from 'react';
import Stepper from '../components/Stepper';
import FileUploadCard from '../components/FileUploadCard';
import PreviewTable from '../components/PreviewTable';
import Banner from '../components/Banner';
import SheetPicker from '../components/SheetPicker';
import Tooltip from '../components/Tooltip';
import { useLang } from '../context/LangContext';
import { findBestCol, EAN_HINTS, CODE_HINTS } from '../utils/columns';
import { buildOutputRows, OUTPUT_COLS } from '../utils/converter';
import { sheetTo2D, downloadXLSX } from '../utils/xlsx';
import { detectHeaderRow, parseFromHeaderRow } from '../utils/headers';
import type { ParsedFile, BannerInfo, ColRef } from '../types';

const PRODUCTSOORT_HINTS  = ['productsoort', 'soort', 'type', 'categorie', 'category'];
const KOSTPRIJS_HINTS     = ['kostprijs', 'inkoopprijs', 'cost', 'inkoop', 'purchase'];
const BESTELNR_HINTS      = ['bestelnummer', 'bestel', 'ordernum', 'ordernr', 'leveranciersnr', 'artikelnummer', 'refnr'];
const VERKOOPPRIJS_HINTS  = ['verkoopprijs', 'verkoop', 'salesprice', 'selling', 'adviesprijs'];
const VEILIGHEID_HINTS    = ['veiligheid', 'safety', 'classif', 'classificatie', 'veiligheidscode'];
const GESLACHT_HINTS      = ['geslacht', 'gender', 'sex'];
const MAAT_HINTS          = ['maat', 'size', 'maten'];
const MERK_HINTS          = ['merk', 'brand', 'merknaam'];
const KLEUR_HINTS         = ['kleur', 'color', 'colour'];
const OMSCHR_HINTS        = ['omschrijving', 'omschr', 'description', 'descri', 'naam', 'name'];
const PRODUCTNAAM_HINTS   = ['productnaam', 'productname', 'titel', 'title'];

const KLEUR_PAGE_SIZE = 50;

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '7px 10px',
  border: '0.5px solid var(--border-md)',
  borderRadius: 'var(--radius-md)' as string,
  background: 'var(--bg)', color: 'var(--text)',
  fontSize: 13, fontFamily: 'inherit',
};

// ── KleurRow — memoized so only the affected row re-renders ──────────────────
//
// Local `localValue` state decouples keystrokes from the parent kleurMapping
// update: the parent is only updated on blur or Enter, not on every keystroke.
// Combined with memo + stable useCallback handlers, this means typing in one
// color input does NOT re-render the other 499 rows.

interface KleurRowProps {
  original: string;
  mapped: string;
  isSelected: boolean;
  isModified: boolean;
  onSelect: (original: string, checked: boolean) => void;
  onValueChange: (original: string, value: string) => void;
  onReset: (original: string) => void;
}

const KleurRow = memo(function KleurRow({
  original, mapped, isSelected, isModified, onSelect, onValueChange, onReset,
}: KleurRowProps) {
  const [localValue, setLocalValue] = useState(mapped);

  // Sync when bulk rename or reset changes the committed value externally
  useEffect(() => { setLocalValue(mapped); }, [mapped]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={e => onSelect(original, e.target.checked)}
        style={{ flexShrink: 0 }}
      />
      <span style={{ flex: '0 0 200px', fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {original}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 16, textAlign: 'center', flexShrink: 0 }}>→</span>
      <input
        type="text"
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        onBlur={() => { if (localValue !== mapped) onValueChange(original, localValue); }}
        onKeyDown={e => { if (e.key === 'Enter') { onValueChange(original, localValue); (e.target as HTMLInputElement).blur(); } }}
        style={{
          flex: 1, fontSize: 12, padding: '3px 8px',
          border: `0.5px solid ${isModified ? 'var(--green-dark)' : 'var(--border-md)'}`,
          borderRadius: 4, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
        }}
      />
      {isModified && (
        <button
          className="btn btn-sm"
          style={{ padding: '1px 7px', fontSize: 11, flexShrink: 0 }}
          title="Reset"
          onClick={() => onReset(original)}
        >
          ↺
        </button>
      )}
    </div>
  );
});

// ── Multi-column combiner ────────────────────────────────

interface MultiColCombinerProps {
  sheetNames: string[];
  primarySheet: string;
  getSheetCols: (sheet: string) => string[];
  selected: ColRef[];
  onChange: (v: ColRef[]) => void;
  label: string;
  hint: string;
  required?: boolean;
  tooltip?: string;
}

function MultiColCombiner({ sheetNames, primarySheet, getSheetCols, selected, onChange, label, hint, required, tooltip }: MultiColCombinerProps) {
  const [activeSheet, setActiveSheet] = useState(primarySheet);
  const cols = getSheetCols(activeSheet);
  const isMultiSheet = sheetNames.length > 1;

  function isChecked(col: string) { return selected.some(r => r.sheet === activeSheet && r.col === col); }
  function toggle(col: string) {
    if (isChecked(col)) onChange(selected.filter(r => !(r.sheet === activeSheet && r.col === col)));
    else onChange([...selected, { sheet: activeSheet, col }]);
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...selected];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    onChange(next);
  }

  return (
    <div>
      <label className="field-label">{label}{required && ' *'}{tooltip && <Tooltip text={tooltip} />}</label>
      <p className="field-hint" style={{ marginBottom: 6 }}>{hint}</p>
      {isMultiSheet && <SheetPicker sheetNames={sheetNames} value={activeSheet} onChange={s => setActiveSheet(s)} />}
      <div className="ean-check-list">
        {cols.map(col => (
          <label key={`${activeSheet}:${col}`}>
            <input type="checkbox" checked={isChecked(col)} onChange={() => toggle(col)} />
            <span>{col}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Combine order:</div>
          {selected.map((ref, idx) => (
            <div key={`${ref.sheet}:${ref.col}:${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <span style={{ flex: 1, fontSize: 11, background: 'var(--bg-secondary)', borderRadius: 4, padding: '3px 8px', border: '0.5px solid var(--border)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {idx + 1}. {isMultiSheet ? `[${ref.sheet}] ` : ''}{ref.col}
              </span>
              <button className="btn btn-sm" style={{ padding: '1px 7px' }} onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
              <button className="btn btn-sm" style={{ padding: '1px 7px' }} onClick={() => move(idx, 1)} disabled={idx === selected.length - 1}>↓</button>
              <button className="btn btn-sm" style={{ padding: '1px 7px', color: 'var(--red-text)' }} onClick={() => onChange(selected.filter((_, i) => i !== idx))}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────

const EMPTY_REF: ColRef = { sheet: '', col: '' };

export default function SupplierConverter() {
  const { lang, t } = useLang();

  const [step, setStep] = useState(1);
  const [supplFile, setSupplFile] = useState<ParsedFile | null>(null);
  const [banner, setBanner] = useState<BannerInfo | null>(null);

  const [hoofdleverancier, setHoofdleverancier] = useState('');
  const [btwInkoop, setBtwInkoop] = useState('3');
  const [startingCode, setStartingCode] = useState('');

  const [barcodeRef,          setBarcodeRef]          = useState<ColRef>(EMPTY_REF);
  const [productsoortRef,     setProductsoortRef]     = useState<ColRef>(EMPTY_REF);
  const [kostprijsRef,        setKostprijsRef]        = useState<ColRef>(EMPTY_REF);
  const [bestelnummerRef,     setBestelnummerRef]     = useState<ColRef>(EMPTY_REF);
  const [verkoopprijsRef,     setVerkoopprijsRef]     = useState<ColRef>(EMPTY_REF);
  const [maatRef,             setMaatRef]             = useState<ColRef>(EMPTY_REF);
  const [kleurRef,            setKleurRef]            = useState<ColRef>(EMPTY_REF);
  const [kleurMapping,        setKleurMapping]        = useState<Record<string, string>>({});
  const [kleurSearch,         setKleurSearch]         = useState('');
  const [kleurSelected,       setKleurSelected]       = useState<Record<string, boolean>>({});
  const [kleurPage,           setKleurPage]           = useState(0);
  const [kleurBulkValue,      setKleurBulkValue]      = useState('');
  const [veiligheidsclassRef, setVeiligheidsclassRef] = useState<ColRef>(EMPTY_REF);
  const [geslachtRef,         setGeslachtRef]         = useState<ColRef>(EMPTY_REF);
  const [merkRef,             setMerkRef]             = useState<ColRef>(EMPTY_REF);
  const [artikelcodeRef,      setArtikelcodeRef]      = useState<ColRef>(EMPTY_REF);
  const [omschrijvingRefs,    setOmschrijvingRefs]    = useState<ColRef[]>([]);
  const [productnaamRefs,     setProductnaamRefs]     = useState<ColRef[]>([]);
  const [outputData,          setOutputData]          = useState<Record<string, unknown>[] | null>(null);
  const [processing,          setProcessing]          = useState(false);
  const [downloading,         setDownloading]         = useState(false);

  const autoDetRef      = useRef<Record<string, string | null>>({});
  const parsedSheetsRef = useRef<Record<string, { cols: string[]; data: Record<string, unknown>[] }>>({});

  // ── Sheet helpers ────────────────────────────────────────

  const sheetNames   = supplFile?.workbook.SheetNames ?? [];
  const primarySheet = sheetNames[0] ?? '';

  function getSheetInfo(sheetName: string): { cols: string[]; data: Record<string, unknown>[] } {
    if (!supplFile) return { cols: [], data: [] };
    if (!sheetName || sheetName === primarySheet) return { cols: supplFile.cols, data: supplFile.data };
    if (parsedSheetsRef.current[sheetName]) return parsedSheetsRef.current[sheetName];
    const ws = supplFile.workbook.Sheets[sheetName];
    if (!ws) return { cols: [], data: [] };
    const rows = sheetTo2D(ws);
    const hIdx = detectHeaderRow(rows);
    const parsed = parseFromHeaderRow(rows, hIdx);
    parsedSheetsRef.current[sheetName] = parsed;
    return parsed;
  }

  function getSheetCols(sheetName: string) { return getSheetInfo(sheetName).cols; }

  function buildKleurMapping(ref: ColRef, existing: Record<string, string>): Record<string, string> {
    if (!ref.col) return {};
    const { data } = getSheetInfo(ref.sheet || primarySheet);
    const unique = [...new Set(data.map(r => String(r[ref.col] ?? '').trim()).filter(Boolean))].sort();
    const mapping: Record<string, string> = {};
    unique.forEach(v => { mapping[v] = existing[v] ?? v; });
    return mapping;
  }

  function handleKleurRefChange(ref: ColRef) {
    setKleurRef(ref);
    setKleurMapping(buildKleurMapping(ref, kleurMapping));
    setKleurSearch(''); setKleurSelected({}); setKleurBulkValue(''); setKleurPage(0);
  }

  // ── Memoized kleur computations ──────────────────────────
  // These are only recomputed when their specific inputs change,
  // preventing the entire color list from being rebuilt on every keystroke.

  const kleurAllEntries = useMemo(
    () => Object.entries(kleurMapping),
    [kleurMapping],
  );

  const kleurTotalModified = useMemo(
    () => kleurAllEntries.filter(([k, v]) => k !== v).length,
    [kleurAllEntries],
  );

  const kleurFiltered = useMemo(() => {
    if (!kleurSearch) return kleurAllEntries;
    const q = kleurSearch.toLowerCase();
    return kleurAllEntries.filter(([k]) => k.toLowerCase().includes(q));
  }, [kleurAllEntries, kleurSearch]);

  const kleurPageCount = useMemo(
    () => Math.max(1, Math.ceil(kleurFiltered.length / KLEUR_PAGE_SIZE)),
    [kleurFiltered],
  );

  const kleurSafePage = Math.min(kleurPage, kleurPageCount - 1);

  const kleurPagedEntries = useMemo(
    () => kleurFiltered.slice(kleurSafePage * KLEUR_PAGE_SIZE, (kleurSafePage + 1) * KLEUR_PAGE_SIZE),
    [kleurFiltered, kleurSafePage],
  );

  const kleurPagedUnmod = useMemo(
    () => kleurPagedEntries.filter(([k, v]) => k === v),
    [kleurPagedEntries],
  );

  const kleurPagedMod = useMemo(
    () => kleurPagedEntries.filter(([k, v]) => k !== v),
    [kleurPagedEntries],
  );

  const kleurSelectedCount = useMemo(
    () => Object.keys(kleurSelected).length,
    [kleurSelected],
  );

  // O(1) membership check — kleurSelected is Record<string, boolean>
  const allFilteredSelected =
    kleurFiltered.length > 0 && kleurFiltered.every(([k]) => kleurSelected[k]);

  // ── Stable KleurRow handlers (useCallback → stable refs → memo skips re-renders) ──

  const handleKleurRowSelect = useCallback((original: string, checked: boolean) => {
    setKleurSelected(prev => {
      if (checked) return { ...prev, [original]: true };
      const next = { ...prev };
      delete next[original];
      return next;
    });
  }, []);

  const handleKleurRowValueChange = useCallback((original: string, value: string) => {
    setKleurMapping(prev => ({ ...prev, [original]: value }));
  }, []);

  const handleKleurRowReset = useCallback((original: string) => {
    setKleurMapping(prev => ({ ...prev, [original]: original }));
  }, []);

  function applyBulk() {
    if (!kleurBulkValue.trim()) return;
    const selectedKeys = Object.keys(kleurSelected);
    setKleurMapping(prev => {
      const next = { ...prev };
      selectedKeys.forEach(k => { next[k] = kleurBulkValue; });
      return next;
    });
    setKleurSelected({}); setKleurBulkValue('');
  }

  // ── Navigation ──────────────────────────────────────────

  function enterStep2() {
    const ps = supplFile!.workbook.SheetNames[0];
    parsedSheetsRef.current = {};
    const { cols, data } = supplFile!;
    const det: Record<string, string | null> = {
      barcode:      findBestCol(cols, data, EAN_HINTS, null),
      productsoort: findBestCol(cols, data, PRODUCTSOORT_HINTS, null),
      kostprijs:    findBestCol(cols, data, KOSTPRIJS_HINTS, null),
      bestelnummer: findBestCol(cols, data, BESTELNR_HINTS, null),
      verkoopprijs: findBestCol(cols, data, VERKOOPPRIJS_HINTS, null),
      veiligheid:   findBestCol(cols, data, VEILIGHEID_HINTS, null),
      geslacht:     findBestCol(cols, data, GESLACHT_HINTS, null),
      maat:         findBestCol(cols, data, MAAT_HINTS, null),
      merk:         findBestCol(cols, data, MERK_HINTS, null),
      kleur:        findBestCol(cols, data, KLEUR_HINTS, null),
      artikelcode:  findBestCol(cols, data, CODE_HINTS, null),
      omschr:       findBestCol(cols, data, OMSCHR_HINTS, null),
      productnaam:  findBestCol(cols, data, PRODUCTNAAM_HINTS, null),
    };
    autoDetRef.current = det;
    const mk = (key: string): ColRef => ({ sheet: ps, col: det[key] || '' });

    setBarcodeRef(mk('barcode'));
    setProductsoortRef(mk('productsoort'));
    setKostprijsRef(mk('kostprijs'));
    setBestelnummerRef(mk('bestelnummer'));
    setVerkoopprijsRef(mk('verkoopprijs'));
    setMaatRef(mk('maat'));
    const kleurDet = mk('kleur');
    setKleurRef(kleurDet);
    setKleurMapping(buildKleurMapping(kleurDet, {}));
    setKleurSearch(''); setKleurSelected({}); setKleurBulkValue(''); setKleurPage(0);
    setVeiligheidsclassRef(mk('veiligheid'));
    setGeslachtRef(mk('geslacht'));
    setMerkRef(mk('merk'));
    setArtikelcodeRef(mk('artikelcode'));
    setOmschrijvingRefs(det.omschr ? [{ sheet: ps, col: det.omschr }] : []);
    setProductnaamRefs(det.productnaam ? [{ sheet: ps, col: det.productnaam }] : []);

    const required = [det.barcode, det.productsoort, det.kostprijs, det.bestelnummer, det.verkoopprijs, det.maat, det.kleur];
    const detected = required.filter(Boolean).length;
    const allOk = detected === required.length;
    setBanner({
      type: allOk ? 'success' : 'warning',
      icon: allOk ? '✓' : '⚠',
      message: allOk
        ? t('scAutoDetAll').replace('{n}', String(required.length))
        : t('scAutoDetPartial').replace('{det}', String(detected)).replace('{n}', String(required.length)),
    });
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function processFiles() {
    const code = parseInt(startingCode, 10);
    if (!hoofdleverancier.trim()) { alert(lang === 'nl' ? 'Voer de leveranciersnaam in (Hoofdleverancier).' : 'Please enter the supplier name (Hoofdleverancier).'); return; }
    if (isNaN(code) || code < 0) { alert(lang === 'nl' ? 'Voer een geldig codenummer in.' : 'Please enter a valid last used code number.'); return; }
    if (!barcodeRef.col) { alert(lang === 'nl' ? 'Selecteer de Barcode-kolom.' : 'Please select the Barcode column.'); return; }
    if (!productsoortRef.col) { alert(lang === 'nl' ? 'Selecteer de Productsoort-kolom.' : 'Please select the Productsoort column.'); return; }
    if (!maatRef.col) { alert(lang === 'nl' ? 'Selecteer de Maat-kolom.' : 'Please select the Maat column.'); return; }
    if (!kleurRef.col) { alert(lang === 'nl' ? 'Selecteer de Kleur-kolom.' : 'Please select the Kleur column.'); return; }
    if (omschrijvingRefs.length === 0) { alert(lang === 'nl' ? 'Selecteer minimaal één kolom voor Omschrijving.' : 'Please select at least one column for Omschrijving.'); return; }
    if (productnaamRefs.length === 0) { alert(lang === 'nl' ? 'Selecteer minimaal één kolom voor Productnaam.' : 'Please select at least one column for Productnaam.'); return; }

    const allRefs: ColRef[] = [
      barcodeRef, productsoortRef, kostprijsRef, bestelnummerRef,
      verkoopprijsRef, veiligheidsclassRef, geslachtRef,
      maatRef, merkRef, kleurRef, artikelcodeRef,
      ...omschrijvingRefs, ...productnaamRefs,
    ];
    const usedSheets = [...new Set(allRefs.map(r => r.sheet || primarySheet))];
    const sheetsData: Record<string, Record<string, unknown>[]> = {};
    usedSheets.forEach(sn => { sheetsData[sn] = getSheetInfo(sn).data; });

    const rowCount = sheetsData[primarySheet]?.length ?? supplFile!.data.length;
    const resolve = (ref: ColRef): ColRef => ({ sheet: ref.sheet || primarySheet, col: ref.col });

    const args = {
      sheetsData, rowCount, startingCode: code,
      hoofdleverancier: hoofdleverancier.trim(), btwInkoop,
      barcodeRef:               resolve(barcodeRef),
      productsoortRef:          resolve(productsoortRef),
      kostprijsRef:             resolve(kostprijsRef),
      bestelnummerRef:          resolve(bestelnummerRef),
      verkoopprijsRef:          resolve(verkoopprijsRef),
      veiligheidsclassificatieRef: resolve(veiligheidsclassRef),
      geslachtRef:              resolve(geslachtRef),
      maatRef:                  resolve(maatRef),
      merkRef:                  resolve(merkRef),
      kleurRef:                 resolve(kleurRef),
      kleurMapping,
      artikelcodeRef:           resolve(artikelcodeRef),
      omschrijvingRefs:         omschrijvingRefs.map(resolve),
      productnaamRefs:          productnaamRefs.map(resolve),
    };

    setProcessing(true);
    setTimeout(() => {
      try {
        setOutputData(buildOutputRows(args));
        setStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } finally {
        setProcessing(false);
      }
    }, 30);
  }

  function downloadFile() {
    const name = supplFile!.fileName.replace(/\.(xlsx?|xlsm|xlsb|ods|csv|tsv|txt)$/i, '_converted.xlsx');
    const data = outputData!;
    setDownloading(true);
    setTimeout(() => {
      try { downloadXLSX(data, [...OUTPUT_COLS], name, 'Exact Import'); }
      finally { setDownloading(false); }
    }, 30);
  }

  // ── Field rendering helpers ──────────────────────────────

  const ad = autoDetRef.current;

  function selClass(key: string, ref: ColRef): string {
    if (!ref.col) return 'needs-review';
    return ref.col === ad[key] ? 'auto-detected' : '';
  }

  function renderField(
    label: string,
    ref: ColRef,
    setRef: (r: ColRef) => void,
    opts: { required?: boolean; optional?: boolean; defaultLabel?: string; hint?: string; autoKey?: string; tooltip?: string } = {},
  ) {
    const { required, optional, defaultLabel, hint, autoKey, tooltip } = opts;
    const cols = getSheetCols(ref.sheet || primarySheet);
    const cls = autoKey ? selClass(autoKey, ref) : (required && !ref.col ? 'needs-review' : '');
    return (
      <div>
        <label className="field-label">{label}{required && ' *'}{tooltip && <Tooltip text={tooltip} />}</label>
        <SheetPicker sheetNames={sheetNames} value={ref.sheet || primarySheet} onChange={s => setRef({ sheet: s, col: '' })} />
        <select value={ref.col} className={cls} onChange={e => setRef({ ...ref, sheet: ref.sheet || primarySheet, col: e.target.value })}>
          <option value="">{defaultLabel ?? (optional ? '— none —' : '— select column —')}</option>
          {cols.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {hint && <p className="field-hint">{hint}</p>}
      </div>
    );
  }

  const activiefVanaf = (() => {
    const now = new Date();
    return `01-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  })();

  const FIXED_FIELDS = [
    { label: t('scActiviefVanaf'),   value: activiefVanaf },
    { label: t('scInkoop'),          value: 'Ja' },
    { label: t('scOrdergestuurd'),   value: 'Ja' },
    { label: t('scVerkoop'),         value: 'Ja' },
    { label: t('scVoorraad'),        value: 'Ja' },
    { label: t('scBtwVerkoop'),      value: '2' },
    { label: t('scEenheidsfactor'),  value: '1' },
    { label: t('scKmsSynch'),        value: 'Ja' },
    { label: t('scControle'),        value: 'NG' },
    { label: t('scEenheidCombo'),    value: t('scDerivedFrom') },
    { label: t('scArtikelcodeZoek'), value: t('scCopyOf') },
  ];

  const STEPS = [
    { num: 1, label: t('scStep1') },
    { num: 2, label: t('scStep2') },
    { num: 3, label: t('scStep3') },
  ];

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="container">
      <header>
        <h1>{t('scTitle')}</h1>
        <p>{t('scDesc')}</p>
      </header>

      <Stepper step={step} onStepClick={setStep} steps={STEPS} />

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <>
          <FileUploadCard title={lang === 'nl' ? 'Leveranciersproductbestand' : 'Supplier product file'} icon="📋" onFileLoaded={setSupplFile} initialFile={supplFile} />
          <div className="actions">
            <button className="btn btn-primary" disabled={!supplFile} onClick={enterStep2}>{t('btnContinue')}</button>
          </div>
        </>
      )}

      {/* ── Step 2: Field mapping ── */}
      {step === 2 && supplFile && (
        <>
          {banner && <Banner {...banner} />}

          {/* General settings */}
          <div className="card">
            <div className="card-title">{t('scSettingsCardTitle')}</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: '0.75rem', marginTop: '-0.25rem' }}>{t('scSettingsCardDesc')}</p>
            <div className="grid-3">
              <div>
                <label className="field-label">{t('scHoofdleverancier')} *<Tooltip text={t('ttHoofdlev')} /></label>
                <input type="text" style={INPUT_STYLE} value={hoofdleverancier} placeholder={t('scHoofdlevPlaceholder')} onChange={e => setHoofdleverancier(e.target.value)} />
                <p className="field-hint">{t('scHoofdlevHint')}</p>
              </div>
              <div>
                <label className="field-label">{t('scBtwInkoop')} *<Tooltip text={t('ttBtwInkoop')} /></label>
                <select value={btwInkoop} onChange={e => setBtwInkoop(e.target.value)}>
                  <option value="3">{t('scBtwHolland')}</option>
                  <option value="9">{t('scBtwEurope')}</option>
                  <option value="10">{t('scBtwOutside')}</option>
                </select>
              </div>
              <div>
                <label className="field-label">{t('scLastCode')} *<Tooltip text={t('ttLastCode')} /></label>
                <input type="number" style={INPUT_STYLE} min="0" value={startingCode} placeholder={t('scLastCodePlaceholder')} onChange={e => setStartingCode(e.target.value)} />
                <p className="field-hint">{t('scLastCodeHint')}</p>
              </div>
            </div>
          </div>

          {/* Column mappings */}
          <div className="card">
            <div className="card-title">{t('scMappingCardTitle')}</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: '0.75rem', marginTop: '-0.25rem' }}>{t('scMappingCardDesc')}</p>
            {sheetNames.length > 1 && (
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{t('scMultiSheetNote')}</p>
            )}
            <div className="grid-3">
              {renderField(t('scBarcode'), barcodeRef, setBarcodeRef, { required: true, autoKey: 'barcode', tooltip: t('ttBarcode') })}
              {renderField(t('scProductsoort'), productsoortRef, setProductsoortRef, { required: true, autoKey: 'productsoort', hint: t('scProductsoortHint'), tooltip: t('ttProductsoort') })}
              {renderField(t('scKostprijs'), kostprijsRef, setKostprijsRef, { required: true, autoKey: 'kostprijs', tooltip: t('ttKostprijs') })}
              {renderField(t('scBestelnummer'), bestelnummerRef, setBestelnummerRef, { required: true, autoKey: 'bestelnummer', hint: t('scBestelnummerHint'), tooltip: t('ttBestelnummer') })}
              {renderField(t('scVerkoopprijs'), verkoopprijsRef, setVerkoopprijsRef, { required: true, autoKey: 'verkoopprijs', tooltip: t('ttVerkoopprijs') })}
              {renderField(t('scMaat'), maatRef, setMaatRef, { required: true, autoKey: 'maat', tooltip: t('ttMaat') })}
              {renderField(t('scKleur'), kleurRef, handleKleurRefChange, { required: true, autoKey: 'kleur', tooltip: t('ttKleur') })}
              {renderField(t('scVeiligheid'), veiligheidsclassRef, setVeiligheidsclassRef, { optional: true, autoKey: 'veiligheid', tooltip: t('ttVeiligheid') })}
            </div>

            <hr className="divider" />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{t('scOptionalCols')}</div>
            <div className="grid-3">
              {renderField(t('scGeslacht'), geslachtRef, setGeslachtRef, { optional: true, defaultLabel: t('scGeslachtDefault'), autoKey: 'geslacht', tooltip: t('ttGeslacht') })}
              {renderField(t('scMerk'), merkRef, setMerkRef, { optional: true, autoKey: 'merk', tooltip: t('ttMerk') })}
              {renderField(t('scArtikelcode'), artikelcodeRef, setArtikelcodeRef, { optional: true, autoKey: 'artikelcode', tooltip: t('ttArtikelcode') })}
            </div>
          </div>

          {/* Color value mapping */}
          {kleurRef.col && kleurAllEntries.length > 0 && (
            <div className="card">
              <div className="card-title">{t('scKleurMapping')}</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                {kleurSearch
                  ? (lang === 'nl'
                      ? `${kleurFiltered.length} van ${kleurAllEntries.length} waarden komen overeen met "${kleurSearch}" — `
                      : `${kleurFiltered.length} of ${kleurAllEntries.length} values matching "${kleurSearch}" — `)
                  : (lang === 'nl'
                      ? `${kleurAllEntries.length} unieke kleurwaarden — `
                      : `${kleurAllEntries.length} unique color values — `)
                }
                <span style={{ color: 'var(--green-dark)', fontWeight: 500 }}>{kleurTotalModified} {t('scKleurModified')}</span>
                {', '}
                <span style={{ color: 'var(--text-secondary)' }}>{kleurAllEntries.length - kleurTotalModified} {t('scKleurUnmodified')}</span>
                {lang === 'nl'
                  ? '. Bewerk de rechterkolom om te hernoemen, of selecteer meerdere voor bulkhernoemen.'
                  : '. Edit the right column to rename, or select multiple and bulk-rename.'}
              </p>

              {/* Search + select-all + reset */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={t('scKleurSearchPh')}
                  value={kleurSearch}
                  onChange={e => { setKleurSearch(e.target.value); setKleurPage(0); }}
                  style={{ flex: 1, fontSize: 12, padding: '4px 8px', border: '0.5px solid var(--border-md)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0, userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={() => {
                      if (allFilteredSelected) {
                        setKleurSelected(prev => {
                          const next = { ...prev };
                          kleurFiltered.forEach(([k]) => delete next[k]);
                          return next;
                        });
                      } else {
                        setKleurSelected(prev => {
                          const next = { ...prev };
                          kleurFiltered.forEach(([k]) => { next[k] = true; });
                          return next;
                        });
                      }
                    }}
                  />
                  {kleurSearch ? t('scKleurSelectFiltered') : t('scKleurSelectAll')} ({kleurFiltered.length})
                </label>
                <button
                  className="btn btn-sm"
                  style={{ fontSize: 11, flexShrink: 0 }}
                  onClick={() => {
                    setKleurMapping(Object.fromEntries(kleurAllEntries.map(([k]) => [k, k])));
                    setKleurSelected({}); setKleurBulkValue('');
                  }}
                >
                  {t('scKleurResetAll')}
                </button>
              </div>

              {/* Bulk rename bar */}
              {kleurSelectedCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {kleurSelectedCount} {lang === 'nl' ? 'geselecteerd' : 'selected'}
                  </span>
                  <input
                    type="text"
                    value={kleurBulkValue}
                    onChange={e => setKleurBulkValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') applyBulk(); }}
                    placeholder={t('scKleurNewValuePh')}
                    style={{ flex: 1, fontSize: 12, padding: '3px 8px', border: '0.5px solid var(--border-md)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }}
                  />
                  <button className="btn btn-sm" style={{ flexShrink: 0 }} onClick={applyBulk}>{t('scKleurApply')}</button>
                  <button className="btn btn-sm" style={{ flexShrink: 0 }} onClick={() => { setKleurSelected({}); setKleurBulkValue(''); }}>{t('scKleurCancel')}</button>
                </div>
              )}

              {/* Column headers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, paddingLeft: 22 }}>
                <span style={{ flex: '0 0 200px', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('scKleurOriginal')}</span>
                <span style={{ width: 16 }} />
                <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('scKleurOutput')}</span>
              </div>

              {/* Paginated rows — max KLEUR_PAGE_SIZE DOM nodes at a time */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 300, overflowY: 'auto' }}>
                {kleurPagedEntries.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0' }}>
                    {t('scKleurNoMatch')} "{kleurSearch}".
                  </div>
                )}

                {kleurPagedUnmod.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 0 2px', opacity: 0.7 }}>
                      {lang === 'nl' ? `Niet aangepast (${kleurPagedUnmod.length})` : `Unmodified (${kleurPagedUnmod.length})`}
                    </div>
                    {kleurPagedUnmod.map(([original, mapped]) => (
                      <KleurRow
                        key={original}
                        original={original}
                        mapped={mapped}
                        isSelected={kleurSelected[original] ?? false}
                        isModified={false}
                        onSelect={handleKleurRowSelect}
                        onValueChange={handleKleurRowValueChange}
                        onReset={handleKleurRowReset}
                      />
                    ))}
                  </>
                )}

                {kleurPagedMod.length > 0 && (
                  <>
                    {kleurPagedUnmod.length > 0 && <div style={{ borderTop: '0.5px solid var(--border)', margin: '6px 0 2px' }} />}
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--green-dark)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 0', opacity: 0.85 }}>
                      {lang === 'nl' ? `Aangepast (${kleurPagedMod.length})` : `Modified (${kleurPagedMod.length})`}
                    </div>
                    {kleurPagedMod.map(([original, mapped]) => (
                      <KleurRow
                        key={original}
                        original={original}
                        mapped={mapped}
                        isSelected={kleurSelected[original] ?? false}
                        isModified={true}
                        onSelect={handleKleurRowSelect}
                        onValueChange={handleKleurRowValueChange}
                        onReset={handleKleurRowReset}
                      />
                    ))}
                  </>
                )}
              </div>

              {/* Pager */}
              {kleurPageCount > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 8, borderTop: '0.5px solid var(--border)', marginTop: 6 }}>
                  <button className="btn btn-sm" disabled={kleurSafePage === 0} onClick={() => setKleurPage(p => p - 1)}>‹</button>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {kleurSafePage + 1} / {kleurPageCount}
                    &nbsp;·&nbsp;
                    {lang === 'nl'
                      ? `${kleurFiltered.length} waarden, ${KLEUR_PAGE_SIZE} per pagina`
                      : `${kleurFiltered.length} values, ${KLEUR_PAGE_SIZE} per page`}
                  </span>
                  <button className="btn btn-sm" disabled={kleurSafePage >= kleurPageCount - 1} onClick={() => setKleurPage(p => p + 1)}>›</button>
                </div>
              )}
            </div>
          )}

          {/* Description columns */}
          <div className="card">
            <div className="card-title">{t('scDescColsCardTitle')}</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: '0.75rem', marginTop: '-0.25rem' }}>{t('scDescColsCardDesc')}</p>
            <div className="grid-2" style={{ alignItems: 'flex-start' }}>
              <MultiColCombiner sheetNames={sheetNames} primarySheet={primarySheet} getSheetCols={getSheetCols} selected={omschrijvingRefs} onChange={setOmschrijvingRefs} label={t('scOmschrijving')} hint={t('scOmschrijvingHint')} tooltip={t('ttOmschrijving')} required />
              <MultiColCombiner sheetNames={sheetNames} primarySheet={primarySheet} getSheetCols={getSheetCols} selected={productnaamRefs} onChange={setProductnaamRefs} label={t('scProductnaam')} hint={t('scProductnaamHint')} tooltip={t('ttProductnaam')} required />
            </div>
          </div>

          {/* Fixed values */}
          <div className="card">
            <div className="card-title">{t('scFixedCardTitle')}</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{t('scFixedCardDesc')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FIXED_FIELDS.map(f => (
                <div key={f.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: 20, fontSize: 11 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{f.label}</span>
                  <span style={{ fontWeight: 500, color: 'var(--green-dark)' }}>→ {f.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="actions">
            <button className="btn" disabled={processing} onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t('scBack')}</button>
            <button className="btn btn-primary" disabled={processing} onClick={processFiles}>
              {processing ? (lang === 'nl' ? 'Verwerken…' : 'Processing…') : t('scConvert')}
            </button>
          </div>
        </>
      )}

      {/* ── Step 3: Preview & Download ── */}
      {step === 3 && outputData && (
        <>
          <div className="card">
            <div className="card-title">{t('scConvCompleteTitle')}</div>
            <div style={{ marginBottom: '1rem' }}>
              <span className="summary-chip">{t('scChipSupplier')}: {hoofdleverancier}</span>
              <span className="summary-chip">{t('scChipBtw')}: {btwInkoop}</span>
              <span className="summary-chip">{t('scChipCodesFrom')}: {parseInt(startingCode, 10) + 1}</span>
            </div>
            <div className="metrics" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
              <div className="metric green">
                <div className="metric-val">{outputData.length}</div>
                <div className="metric-lbl">{t('scMetricConverted')}</div>
              </div>
              <div className="metric">
                <div className="metric-val">{OUTPUT_COLS.length}</div>
                <div className="metric-lbl">{t('scMetricCols')}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">{t('scPreviewCardTitle')}</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('scPreviewCardDesc')}</p>
            <PreviewTable cols={[...OUTPUT_COLS]} data={outputData} />
          </div>

          <div className="actions">
            <button className="btn" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t('scBack')}</button>
            <button className="btn btn-download" disabled={downloading} onClick={downloadFile}>
              {downloading ? (lang === 'nl' ? 'Downloaden…' : 'Downloading…') : t('scDownload')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
