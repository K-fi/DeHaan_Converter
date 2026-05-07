import { useState, useRef } from 'react';
import Stepper from '../components/Stepper';
import FileUploadCard from '../components/FileUploadCard';
import PreviewTable from '../components/PreviewTable';
import Banner from '../components/Banner';
import SheetPicker from '../components/SheetPicker';
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

const CONVERTER_STEPS = [
  { num: 1, label: 'Upload file' },
  { num: 2, label: 'Map fields' },
  { num: 3, label: 'Preview & Download' },
];

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  border: '0.5px solid var(--border-md)',
  borderRadius: 'var(--radius-md)' as string,
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: 13,
  fontFamily: 'inherit',
};

// ── NL → EN translations ─────────────────────────────────

const EN: Record<string, string> = {
  'Hoofdleverancier':                    'Main supplier',
  'Btw-code: Inkoop':                    'VAT code: Purchase',
  'Barcode':                             'Barcode',
  'Productsoort':                        'Product type',
  'Kostprijs':                           'Cost price',
  'Bestelnummer leverancier':            'Supplier order number',
  'Verkoopprijs':                        'Selling price',
  'Maat':                                'Size',
  'Kleur':                               'Color',
  'Veiligheidsclassificatie':            'Safety classification',
  'Geslacht':                            'Gender',
  'Merk':                                'Brand',
  'Artikelcode':                         'Article code',
  'Omschrijving':                        'Description',
  'Productnaam':                         'Product name',
  'productsoort_hint':                   'Drives Article group and Unit derivation.',
  'bestelnummer_hint':                   'Also copied to Supplier article code search field.',
  'omschrijving_hint':                   'Select one or more columns. Values are joined and truncated to 60 characters. Extra description gets the full untruncated value.',
  'Actief vanaf':                        'Active from',
  'Inkoop':                              'Purchase',
  'Ordergestuurd':                       'Order driven',
  'Verkoop':                             'Sales',
  'Voorraad':                            'Stock',
  'Btw-code: Verkoop':                   'VAT code: Sales',
  'Eenheidsfactor':                      'Unit factor',
  'KMS Synchronisatie':                  'KMS Synchronisation',
  '2026 Controle JW':                    '2026 Control JW',
  'Eenheid + Inkoopeenheid':             'Unit + Purchase unit',
  'Artikelcode Hoofdleverancier zoekveld': 'Supplier article code search field',
  'Derived from Productsoort':           'Derived from Product type',
  'Copy of Bestelnummer leverancier':    'Copy of Supplier order number',
};

// ── Multi-column combiner with sheet support ─────────────

interface MultiColCombinerProps {
  sheetNames: string[];
  primarySheet: string;
  getSheetCols: (sheet: string) => string[];
  selected: ColRef[];
  onChange: (v: ColRef[]) => void;
  label: string;
  hint: string;
  required?: boolean;
}

function MultiColCombiner({
  sheetNames, primarySheet, getSheetCols,
  selected, onChange, label, hint, required,
}: MultiColCombinerProps) {
  const [activeSheet, setActiveSheet] = useState(primarySheet);
  const cols = getSheetCols(activeSheet);
  const isMultiSheet = sheetNames.length > 1;

  function isChecked(col: string) {
    return selected.some(r => r.sheet === activeSheet && r.col === col);
  }

  function toggle(col: string) {
    if (isChecked(col)) {
      onChange(selected.filter(r => !(r.sheet === activeSheet && r.col === col)));
    } else {
      onChange([...selected, { sheet: activeSheet, col }]);
    }
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...selected];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    onChange(next);
  }

  return (
    <div>
      <label className="field-label">{label}{required && ' *'}</label>
      <p className="field-hint" style={{ marginBottom: 6 }}>{hint}</p>
      {isMultiSheet && (
        <SheetPicker
          sheetNames={sheetNames}
          value={activeSheet}
          onChange={s => setActiveSheet(s)}
        />
      )}
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
  const [step, setStep] = useState(1);
  const [supplFile, setSupplFile] = useState<ParsedFile | null>(null);
  const [banner, setBanner] = useState<BannerInfo | null>(null);
  const [showEnglish, setShowEnglish] = useState(false);

  // General settings
  const [hoofdleverancier, setHoofdleverancier] = useState('');
  const [btwInkoop, setBtwInkoop] = useState('3');
  const [startingCode, setStartingCode] = useState('');

  // Column refs — each holds { sheet, col }
  const [barcodeRef,               setBarcodeRef]               = useState<ColRef>(EMPTY_REF);
  const [productsoortRef,          setProductsoortRef]          = useState<ColRef>(EMPTY_REF);
  const [kostprijsRef,             setKostprijsRef]             = useState<ColRef>(EMPTY_REF);
  const [bestelnummerRef,          setBestelnummerRef]          = useState<ColRef>(EMPTY_REF);
  const [verkoopprijsRef,          setVerkoopprijsRef]          = useState<ColRef>(EMPTY_REF);
  const [maatRef,                  setMaatRef]                  = useState<ColRef>(EMPTY_REF);
  const [kleurRef,                 setKleurRef]                 = useState<ColRef>(EMPTY_REF);
  const [veiligheidsclassRef,      setVeiligheidsclassRef]      = useState<ColRef>(EMPTY_REF);
  const [geslachtRef,              setGeslachtRef]              = useState<ColRef>(EMPTY_REF);
  const [merkRef,                  setMerkRef]                  = useState<ColRef>(EMPTY_REF);
  const [artikelcodeRef,           setArtikelcodeRef]           = useState<ColRef>(EMPTY_REF);
  const [omschrijvingRefs,         setOmschrijvingRefs]         = useState<ColRef[]>([]);
  const [productnaamRefs,          setProductnaamRefs]          = useState<ColRef[]>([]);

  // Results
  const [outputData, setOutputData] = useState<Record<string, unknown>[] | null>(null);

  const autoDetRef  = useRef<Record<string, string | null>>({});
  const parsedSheetsRef = useRef<Record<string, { cols: string[]; data: Record<string, unknown>[] }>>({});

  // ── Translation helper ──────────────────────────────────

  function t(dutch: string) {
    return showEnglish ? (EN[dutch] ?? dutch) : dutch;
  }

  // ── Sheet helpers ────────────────────────────────────────

  const sheetNames = supplFile?.workbook.SheetNames ?? [];
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

  function getSheetCols(sheetName: string): string[] {
    return getSheetInfo(sheetName).cols;
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
    setKleurRef(mk('kleur'));
    setVeiligheidsclassRef(mk('veiligheid'));
    setGeslachtRef(mk('geslacht'));
    setMerkRef(mk('merk'));
    setArtikelcodeRef(mk('artikelcode'));
    setOmschrijvingRefs(det.omschr ? [{ sheet: ps, col: det.omschr }] : []);
    setProductnaamRefs(det.productnaam ? [{ sheet: ps, col: det.productnaam }] : []);

    const required = [det.barcode, det.productsoort, det.kostprijs, det.bestelnummer, det.verkoopprijs, det.maat, det.kleur];
    const detected = required.filter(Boolean).length;
    setBanner({
      type: detected === required.length ? 'success' : 'warning',
      icon: detected === required.length ? '✓' : '⚠',
      message: detected === required.length
        ? `Auto-detected all ${required.length} required columns. Please verify below.`
        : `Auto-detected ${detected} of ${required.length} required columns — highlighted fields need manual selection.`,
    });

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function processFiles() {
    const code = parseInt(startingCode, 10);
    if (!hoofdleverancier.trim()) { alert('Please enter the supplier name (Hoofdleverancier).'); return; }
    if (isNaN(code) || code < 0) { alert('Please enter a valid last used code number.'); return; }
    if (!barcodeRef.col) { alert('Please select the Barcode column.'); return; }
    if (!productsoortRef.col) { alert('Please select the Productsoort column.'); return; }
    if (!maatRef.col) { alert('Please select the Maat column.'); return; }
    if (!kleurRef.col) { alert('Please select the Kleur column.'); return; }
    if (omschrijvingRefs.length === 0) { alert('Please select at least one column for Omschrijving.'); return; }
    if (productnaamRefs.length === 0) { alert('Please select at least one column for Productnaam.'); return; }

    // Collect all referenced sheets and build sheetsData
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

    setOutputData(buildOutputRows({
      sheetsData,
      rowCount,
      startingCode: code,
      hoofdleverancier: hoofdleverancier.trim(),
      btwInkoop,
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
      artikelcodeRef:           resolve(artikelcodeRef),
      omschrijvingRefs:         omschrijvingRefs.map(resolve),
      productnaamRefs:          productnaamRefs.map(resolve),
    }));

    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function downloadFile() {
    const name = supplFile!.fileName.replace(/\.(xlsx?|xlsm|xlsb|ods|csv|tsv|txt)$/i, '_converted.xlsx');
    downloadXLSX(outputData!, [...OUTPUT_COLS], name, 'Exact Import');
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
    opts: {
      required?: boolean;
      optional?: boolean;
      defaultLabel?: string;
      hint?: string;
      autoKey?: string;
    } = {},
  ) {
    const { required, optional, defaultLabel, hint, autoKey } = opts;
    const cols = getSheetCols(ref.sheet || primarySheet);
    const cls = autoKey ? selClass(autoKey, ref) : (required && !ref.col ? 'needs-review' : '');
    return (
      <div>
        <label className="field-label">{label}{required && ' *'}</label>
        <SheetPicker
          sheetNames={sheetNames}
          value={ref.sheet || primarySheet}
          onChange={s => setRef({ sheet: s, col: '' })}
        />
        <select
          value={ref.col}
          className={cls}
          onChange={e => setRef({ ...ref, sheet: ref.sheet || primarySheet, col: e.target.value })}
        >
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
    { label: t('Actief vanaf'),                        value: activiefVanaf },
    { label: t('Inkoop'),                              value: 'Ja' },
    { label: t('Ordergestuurd'),                       value: 'Ja' },
    { label: t('Verkoop'),                             value: 'Ja' },
    { label: t('Voorraad'),                            value: 'Ja' },
    { label: t('Btw-code: Verkoop'),                   value: '2' },
    { label: t('Eenheidsfactor'),                      value: '1' },
    { label: t('KMS Synchronisatie'),                  value: 'Ja' },
    { label: t('2026 Controle JW'),                    value: 'NG' },
    { label: t('Eenheid + Inkoopeenheid'),             value: t('Derived from Productsoort') },
    { label: t('Artikelcode Hoofdleverancier zoekveld'), value: t('Copy of Bestelnummer leverancier') },
  ];

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="container">
      <header>
        <h1>Exact Online — Supplier Data Converter</h1>
        <p>Convert any supplier product file into the standardized Exact Online import format.</p>
      </header>

      <Stepper step={step} onStepClick={setStep} steps={CONVERTER_STEPS} />

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <>
          <FileUploadCard
            title="Supplier product file"
            icon="📋"
            onFileLoaded={setSupplFile}
            initialFile={supplFile}
          />
          <div className="actions">
            <button className="btn btn-primary" disabled={!supplFile} onClick={enterStep2}>
              Continue →
            </button>
          </div>
        </>
      )}

      {/* ── Step 2: Field mapping ── */}
      {step === 2 && supplFile && (
        <>
          {/* NL / EN toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <div style={{ display: 'flex', border: '0.5px solid var(--border-md)', borderRadius: 'var(--radius-md)', overflow: 'hidden', fontSize: 12 }}>
              <button
                onClick={() => setShowEnglish(false)}
                style={{ padding: '5px 14px', background: !showEnglish ? 'var(--green-bg)' : 'var(--bg)', color: !showEnglish ? 'var(--green-text)' : 'var(--text-secondary)', fontWeight: !showEnglish ? 500 : 400, border: 'none', cursor: 'pointer', transition: 'all 0.1s' }}
              >
                NL
              </button>
              <button
                onClick={() => setShowEnglish(true)}
                style={{ padding: '5px 14px', background: showEnglish ? 'var(--green-bg)' : 'var(--bg)', color: showEnglish ? 'var(--green-text)' : 'var(--text-secondary)', fontWeight: showEnglish ? 500 : 400, border: 'none', borderLeft: '0.5px solid var(--border-md)', cursor: 'pointer', transition: 'all 0.1s' }}
              >
                EN
              </button>
            </div>
          </div>

          {banner && <Banner {...banner} />}

          {/* General settings */}
          <div className="card">
            <div className="card-title">Supplier settings</div>
            <div className="grid-3">
              <div>
                <label className="field-label">{t('Hoofdleverancier')} *</label>
                <input
                  type="text"
                  style={INPUT_STYLE}
                  value={hoofdleverancier}
                  placeholder="e.g. Nike"
                  onChange={e => setHoofdleverancier(e.target.value)}
                />
                <p className="field-hint">Written to every row in the output.</p>
              </div>
              <div>
                <label className="field-label">{t('Btw-code: Inkoop')} *</label>
                <select value={btwInkoop} onChange={e => setBtwInkoop(e.target.value)}>
                  <option value="3">Holland (3)</option>
                  <option value="9">Europe (9)</option>
                  <option value="10">Outside Europe (10)</option>
                </select>
              </div>
              <div>
                <label className="field-label">Last used code number *</label>
                <input
                  type="number"
                  style={INPUT_STYLE}
                  min="0"
                  value={startingCode}
                  placeholder="e.g. 1000"
                  onChange={e => setStartingCode(e.target.value)}
                />
                <p className="field-hint">New rows are assigned this number + 1, + 2, etc.</p>
              </div>
            </div>
          </div>

          {/* Column mappings */}
          <div className="card">
            <div className="card-title">Column mappings</div>
            {sheetNames.length > 1 && (
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                This file has multiple sheets. Use the small sheet selector above each dropdown to pick columns from different sheets.
              </p>
            )}
            <div className="grid-3">
              {renderField(t('Barcode'), barcodeRef, setBarcodeRef, { required: true, autoKey: 'barcode' })}
              {renderField(t('Productsoort'), productsoortRef, setProductsoortRef, {
                required: true, autoKey: 'productsoort',
                hint: t('productsoort_hint') || 'Drives Artikelgroep and Eenheid derivation.',
              })}
              {renderField(t('Kostprijs'), kostprijsRef, setKostprijsRef, { required: true, autoKey: 'kostprijs' })}
              {renderField(t('Bestelnummer leverancier'), bestelnummerRef, setBestelnummerRef, {
                required: true, autoKey: 'bestelnummer',
                hint: t('bestelnummer_hint') || 'Also copied to Artikelcode Hoofdleverancier zoekveld.',
              })}
              {renderField(t('Verkoopprijs'), verkoopprijsRef, setVerkoopprijsRef, { required: true, autoKey: 'verkoopprijs' })}
              {renderField(t('Maat'), maatRef, setMaatRef, { required: true, autoKey: 'maat' })}
              {renderField(t('Kleur'), kleurRef, setKleurRef, { required: true, autoKey: 'kleur' })}
              {renderField(t('Veiligheidsclassificatie'), veiligheidsclassRef, setVeiligheidsclassRef, { optional: true, autoKey: 'veiligheid' })}
            </div>

            <hr className="divider" />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Optional columns</div>
            <div className="grid-3">
              {renderField(t('Geslacht'), geslachtRef, setGeslachtRef, { optional: true, defaultLabel: '— default to Unisex —', autoKey: 'geslacht' })}
              {renderField(t('Merk'), merkRef, setMerkRef, { optional: true, autoKey: 'merk' })}
              {renderField(t('Artikelcode'), artikelcodeRef, setArtikelcodeRef, { optional: true, autoKey: 'artikelcode' })}
            </div>
          </div>

          {/* Description columns */}
          <div className="card">
            <div className="card-title">Description columns</div>
            <div className="grid-2" style={{ alignItems: 'flex-start' }}>
              <MultiColCombiner
                sheetNames={sheetNames}
                primarySheet={primarySheet}
                getSheetCols={getSheetCols}
                selected={omschrijvingRefs}
                onChange={setOmschrijvingRefs}
                label={t('Omschrijving')}
                hint={
                  showEnglish
                    ? (EN['omschrijving_hint'] ?? '')
                    : 'Select one or more columns. Values are joined and truncated to 60 characters. Extra omschrijving gets the full untruncated value.'
                }
                required
              />
              <MultiColCombiner
                sheetNames={sheetNames}
                primarySheet={primarySheet}
                getSheetCols={getSheetCols}
                selected={productnaamRefs}
                onChange={setProductnaamRefs}
                label={t('Productnaam')}
                hint="Select columns to combine — typically: brand + product type + article type + safety classification code."
                required
              />
            </div>
          </div>

          {/* Fixed values */}
          <div className="card">
            <div className="card-title">Fixed output values</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              These fields are set automatically — no input needed.
            </p>
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
            <button className="btn" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>← Back</button>
            <button className="btn btn-primary" onClick={processFiles}>Convert →</button>
          </div>
        </>
      )}

      {/* ── Step 3: Preview & Download ── */}
      {step === 3 && outputData && (
        <>
          <div className="card">
            <div className="card-title">Conversion complete</div>
            <div style={{ marginBottom: '1rem' }}>
              <span className="summary-chip">Supplier: {hoofdleverancier}</span>
              <span className="summary-chip">Btw Inkoop: {btwInkoop}</span>
              <span className="summary-chip">Codes from: {parseInt(startingCode, 10) + 1}</span>
            </div>
            <div className="metrics" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
              <div className="metric green">
                <div className="metric-val">{outputData.length}</div>
                <div className="metric-lbl">rows converted</div>
              </div>
              <div className="metric">
                <div className="metric-val">{OUTPUT_COLS.length}</div>
                <div className="metric-lbl">output columns</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Output preview</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              First rows in Exact Online column order — use the arrows to page through all columns.
            </p>
            <PreviewTable cols={[...OUTPUT_COLS]} data={outputData} />
          </div>

          <div className="actions">
            <button className="btn" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>← Back</button>
            <button className="btn btn-download" onClick={downloadFile}>⬇ Download converted file (.xlsx)</button>
          </div>
        </>
      )}
    </div>
  );
}
