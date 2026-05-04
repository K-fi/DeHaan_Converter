import { useState, useRef } from 'react';
import Stepper from '../components/Stepper';
import FileUploadCard from '../components/FileUploadCard';
import PreviewTable from '../components/PreviewTable';
import Banner from '../components/Banner';
import { findBestCol, EAN_HINTS, CODE_HINTS } from '../utils/columns';
import { buildOutputRows, OUTPUT_COLS } from '../utils/converter';
import { downloadXLSX } from '../utils/xlsx';
import type { ParsedFile, BannerInfo } from '../types';

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

// ── NL → EN translations for Step 2 labels ──────────────

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
  // hints
  'productsoort_hint':                   'Drives Article group and Unit derivation.',
  'bestelnummer_hint':                   'Also copied to Supplier article code search field.',
  'omschrijving_hint':                   'Select one or more columns. Values are joined and truncated to 60 characters. Extra description gets the full untruncated value.',
  // fixed-field labels
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

// ── Multi-column combiner ────────────────────────────────

interface MultiColCombinerProps {
  cols: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  label: string;
  hint: string;
  required?: boolean;
}

function MultiColCombiner({ cols, selected, onChange, label, hint, required }: MultiColCombinerProps) {
  function toggle(col: string) {
    onChange(selected.includes(col) ? selected.filter(c => c !== col) : [...selected, col]);
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
      <div className="ean-check-list">
        {cols.map(col => (
          <label key={col}>
            <input type="checkbox" checked={selected.includes(col)} onChange={() => toggle(col)} />
            <span>{col}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Combine order:</div>
          {selected.map((col, idx) => (
            <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <span style={{ flex: 1, fontSize: 11, background: 'var(--bg-secondary)', borderRadius: 4, padding: '3px 8px', border: '0.5px solid var(--border)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {idx + 1}. {col}
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

export default function SupplierConverter() {
  const [step, setStep] = useState(1);
  const [supplFile, setSupplFile] = useState<ParsedFile | null>(null);
  const [banner, setBanner] = useState<BannerInfo | null>(null);
  const [showEnglish, setShowEnglish] = useState(false);

  // General settings
  const [hoofdleverancier, setHoofdleverancier] = useState('');
  const [btwInkoop, setBtwInkoop] = useState('3');
  const [startingCode, setStartingCode] = useState('');

  // Column mappings — required
  const [barcodeCol, setBarcodeCol] = useState('');
  const [productsoortCol, setProductsoortCol] = useState('');
  const [kostprijsCol, setKostprijsCol] = useState('');
  const [bestelnummerCol, setBestelnummerCol] = useState('');
  const [verkoopprijsCol, setVerkoopprijsCol] = useState('');
  const [maatCol, setMaatCol] = useState('');
  const [kleurCol, setKleurCol] = useState('');

  // Column mappings — optional
  const [veiligheidsclassificatieCol, setVeiligheidsclassificatieCol] = useState('');
  const [geslachtCol, setGeslachtCol] = useState('');
  const [merkCol, setMerkCol] = useState('');
  const [artikelcodeCol, setArtikelcodeCol] = useState('');

  // Multi-column combiners
  const [omschrijvingCols, setOmschrijvingCols] = useState<string[]>([]);
  const [productnaamCols, setProductnaamCols] = useState<string[]>([]);

  // Results
  const [outputData, setOutputData] = useState<Record<string, unknown>[] | null>(null);

  const autoDetRef = useRef<Record<string, string | null>>({});

  // ── Translation helper ───────────────────────────────────

  function t(dutch: string) {
    return showEnglish ? (EN[dutch] ?? dutch) : dutch;
  }

  // ── Navigation ──────────────────────────────────────────

  function enterStep2() {
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

    setBarcodeCol(det.barcode || '');
    setProductsoortCol(det.productsoort || '');
    setKostprijsCol(det.kostprijs || '');
    setBestelnummerCol(det.bestelnummer || '');
    setVerkoopprijsCol(det.verkoopprijs || '');
    setMaatCol(det.maat || '');
    setKleurCol(det.kleur || '');
    setVeiligheidsclassificatieCol(det.veiligheid || '');
    setGeslachtCol(det.geslacht || '');
    setMerkCol(det.merk || '');
    setArtikelcodeCol(det.artikelcode || '');
    setOmschrijvingCols(det.omschr ? [det.omschr] : []);
    setProductnaamCols(det.productnaam ? [det.productnaam] : []);

    const requiredDet = [det.barcode, det.productsoort, det.kostprijs, det.bestelnummer, det.verkoopprijs, det.maat, det.kleur];
    const detected = requiredDet.filter(Boolean).length;
    const total = requiredDet.length;
    setBanner({
      type: detected === total ? 'success' : 'warning',
      icon: detected === total ? '✓' : '⚠',
      message: detected === total
        ? `Auto-detected all ${total} required columns. Please verify below.`
        : `Auto-detected ${detected} of ${total} required columns — highlighted fields need manual selection.`,
    });

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function processFiles() {
    const code = parseInt(startingCode, 10);
    if (!hoofdleverancier.trim()) { alert('Please enter the supplier name (Hoofdleverancier).'); return; }
    if (isNaN(code) || code < 0) { alert('Please enter a valid last used code number.'); return; }
    if (!barcodeCol) { alert('Please select the Barcode column.'); return; }
    if (!productsoortCol) { alert('Please select the Productsoort column.'); return; }
    if (!maatCol) { alert('Please select the Maat column.'); return; }
    if (!kleurCol) { alert('Please select the Kleur column.'); return; }
    if (omschrijvingCols.length === 0) { alert('Please select at least one column for Omschrijving.'); return; }
    if (productnaamCols.length === 0) { alert('Please select at least one column for Productnaam.'); return; }

    setOutputData(buildOutputRows({
      supplFile: supplFile!,
      startingCode: code,
      hoofdleverancier: hoofdleverancier.trim(),
      btwInkoop,
      barcodeCol,
      productsoortCol,
      kostprijsCol,
      bestelnummerCol,
      verkoopprijsCol,
      veiligheidsclassificatieCol,
      geslachtCol,
      maatCol,
      merkCol,
      kleurCol,
      artikelcodeCol,
      omschrijvingCols,
      productnaamCols,
    }));

    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function downloadFile() {
    const name = supplFile!.fileName.replace(/\.(xlsx?|xlsm|xlsb|ods|csv|tsv|txt)$/i, '_converted.xlsx');
    downloadXLSX(outputData!, [...OUTPUT_COLS], name, 'Exact Import');
  }

  // ── Helpers ──────────────────────────────────────────────

  const ad = autoDetRef.current;

  function selClass(key: string, val: string) {
    if (!val) return 'needs-review';
    return val === ad[key] ? 'auto-detected' : '';
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
                  <option value="10">Europe (10)</option>
                  <option value="9">Outside Europe (9)</option>
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
            <div className="grid-3">
              <div>
                <label className="field-label">{t('Barcode')} *</label>
                <select value={barcodeCol} className={selClass('barcode', barcodeCol)} onChange={e => setBarcodeCol(e.target.value)}>
                  <option value="">— select column —</option>
                  {supplFile.cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">{t('Productsoort')} *</label>
                <select value={productsoortCol} className={selClass('productsoort', productsoortCol)} onChange={e => setProductsoortCol(e.target.value)}>
                  <option value="">— select column —</option>
                  {supplFile.cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className="field-hint">{t('productsoort_hint') || 'Drives Artikelgroep and Eenheid derivation.'}</p>
              </div>
              <div>
                <label className="field-label">{t('Kostprijs')} *</label>
                <select value={kostprijsCol} className={selClass('kostprijs', kostprijsCol)} onChange={e => setKostprijsCol(e.target.value)}>
                  <option value="">— select column —</option>
                  {supplFile.cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">{t('Bestelnummer leverancier')} *</label>
                <select value={bestelnummerCol} className={selClass('bestelnummer', bestelnummerCol)} onChange={e => setBestelnummerCol(e.target.value)}>
                  <option value="">— select column —</option>
                  {supplFile.cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className="field-hint">{t('bestelnummer_hint') || 'Also copied to Artikelcode Hoofdleverancier zoekveld.'}</p>
              </div>
              <div>
                <label className="field-label">{t('Verkoopprijs')} *</label>
                <select value={verkoopprijsCol} className={selClass('verkoopprijs', verkoopprijsCol)} onChange={e => setVerkoopprijsCol(e.target.value)}>
                  <option value="">— select column —</option>
                  {supplFile.cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">{t('Maat')} *</label>
                <select value={maatCol} className={selClass('maat', maatCol)} onChange={e => setMaatCol(e.target.value)}>
                  <option value="">— select column —</option>
                  {supplFile.cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">{t('Kleur')} *</label>
                <select value={kleurCol} className={selClass('kleur', kleurCol)} onChange={e => setKleurCol(e.target.value)}>
                  <option value="">— select column —</option>
                  {supplFile.cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">{t('Veiligheidsclassificatie')}</label>
                <select
                  value={veiligheidsclassificatieCol}
                  className={veiligheidsclassificatieCol && veiligheidsclassificatieCol === ad['veiligheid'] ? 'auto-detected' : ''}
                  onChange={e => setVeiligheidsclassificatieCol(e.target.value)}
                >
                  <option value="">— none —</option>
                  {supplFile.cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <hr className="divider" />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Optional columns</div>
            <div className="grid-3">
              <div>
                <label className="field-label">{t('Geslacht')}</label>
                <select
                  value={geslachtCol}
                  className={geslachtCol && geslachtCol === ad['geslacht'] ? 'auto-detected' : ''}
                  onChange={e => setGeslachtCol(e.target.value)}
                >
                  <option value="">— default to Unisex —</option>
                  {supplFile.cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">{t('Merk')}</label>
                <select
                  value={merkCol}
                  className={merkCol && merkCol === ad['merk'] ? 'auto-detected' : ''}
                  onChange={e => setMerkCol(e.target.value)}
                >
                  <option value="">— none —</option>
                  {supplFile.cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">{t('Artikelcode')}</label>
                <select
                  value={artikelcodeCol}
                  className={artikelcodeCol && artikelcodeCol === ad['artikelcode'] ? 'auto-detected' : ''}
                  onChange={e => setArtikelcodeCol(e.target.value)}
                >
                  <option value="">— none —</option>
                  {supplFile.cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Description columns */}
          <div className="card">
            <div className="card-title">Description columns</div>
            <div className="grid-2" style={{ alignItems: 'flex-start' }}>
              <MultiColCombiner
                cols={supplFile.cols}
                selected={omschrijvingCols}
                onChange={setOmschrijvingCols}
                label={t('Omschrijving')}
                hint={
                  showEnglish
                    ? (EN['omschrijving_hint'] ?? '')
                    : 'Select one or more columns. Values are joined and truncated to 60 characters. Extra omschrijving gets the full untruncated value.'
                }
                required
              />
              <MultiColCombiner
                cols={supplFile.cols}
                selected={productnaamCols}
                onChange={setProductnaamCols}
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
