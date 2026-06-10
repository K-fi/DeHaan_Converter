'use client';

import { useState, useMemo, useRef, useEffect, memo } from 'react';
import { useLang } from '../context/LangContext';
import Banner from './Banner';
import {
  type MappingStore,
  saveMappingStore,
  exportMappingStore,
  importMappingStore,
  isMapped,
} from '../utils/mappingStore';
import {
  PRODUCTSOORT_TO_ARTIKELGROEP,
  PRODUCTSOORT_TO_EENHEID,
  ENGLISH_TO_DUTCH_PRODUCTSOORT,
  ARTIKELGROEP_OPTIONS,
  DEFAULT_ARTIKELGROEP,
  DEFAULT_EENHEID,
} from '../constants/converterMappings';

const PAGE_SIZE = 30;

const INPUT: React.CSSProperties = {
  fontSize: 11, padding: '2px 6px',
  border: '0.5px solid var(--border-md)', borderRadius: 4,
  background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
};

// ── helpers ──────────────────────────────────────────────

/** English alias → Dutch key (exact then case-insensitive) */
function englishAlias(key: string): string | undefined {
  const nl = ENGLISH_TO_DUTCH_PRODUCTSOORT[key];
  if (nl) return nl;
  const lower = key.toLowerCase();
  const enKey = Object.keys(ENGLISH_TO_DUTCH_PRODUCTSOORT).find(k => k.toLowerCase() === lower);
  return enKey ? ENGLISH_TO_DUTCH_PRODUCTSOORT[enKey] : undefined;
}

/** The effective default artikelgroep for a key (direct built-in → alias → DEFAULT) */
function defaultAg(key: string): string {
  if (PRODUCTSOORT_TO_ARTIKELGROEP[key]) return PRODUCTSOORT_TO_ARTIKELGROEP[key];
  const dk = englishAlias(key);
  if (dk && PRODUCTSOORT_TO_ARTIKELGROEP[dk]) return PRODUCTSOORT_TO_ARTIKELGROEP[dk];
  return DEFAULT_ARTIKELGROEP;
}

/** The effective default eenheid for a key (direct built-in → alias → DEFAULT) */
function defaultEh(key: string): string {
  if (PRODUCTSOORT_TO_EENHEID[key]) return PRODUCTSOORT_TO_EENHEID[key];
  const dk = englishAlias(key);
  if (dk && PRODUCTSOORT_TO_EENHEID[dk]) return PRODUCTSOORT_TO_EENHEID[dk];
  return DEFAULT_EENHEID;
}

/** Effective display value for artikelgroep (store → default chain) */
function effectiveAg(key: string, store: MappingStore): string {
  return store[key]?.artikelgroep ?? defaultAg(key);
}
/** Effective display value for eenheid */
function effectiveEh(key: string, store: MappingStore): string {
  return store[key]?.eenheid ?? defaultEh(key);
}

/** True if a key has no entry in the built-in table and no English alias */
function isUnknownKey(key: string): boolean {
  return !(key in PRODUCTSOORT_TO_ARTIKELGROEP) && !englishAlias(key);
}

/**
 * A key is "custom" when:
 * - It is an unknown key (not built-in, not alias) and is in the store — always custom
 *   because the key itself was user-added; even if values happen to match defaults.
 * - It is a built-in/alias key in the store whose values differ from the defaults.
 */
function isCustomKey(key: string, store: MappingStore): boolean {
  if (!(key in store)) return false;
  if (isUnknownKey(key)) return true; // unknown keys are always custom once in the store
  return store[key].artikelgroep !== defaultAg(key) || store[key].eenheid !== defaultEh(key);
}

/**
 * Write an edit to the local store.
 * For built-in/alias rows: if both values match the effective defaults, remove
 * the override so the row reverts to "Built-in" or "EN → NL".
 * For unknown keys: always save — there is no built-in to revert to.
 */
function writeEdit(
  key: string, field: 'ag' | 'eh', value: string,
  store: MappingStore, setStore: (s: MappingStore) => void,
) {
  const dAg = defaultAg(key);
  const dEh = defaultEh(key);
  const cur = store[key];
  const nextAg = field === 'ag' ? value : (cur?.artikelgroep ?? dAg);
  const nextEh = field === 'eh' ? value : (cur?.eenheid ?? dEh);
  // Only auto-revert for built-in / alias rows (unknown keys have nothing to revert to)
  if (!isUnknownKey(key) && nextAg === dAg && nextEh === dEh) {
    const next = { ...store }; delete next[key]; setStore(next);
  } else {
    setStore({ ...store, [key]: { artikelgroep: nextAg, eenheid: nextEh } });
  }
}

function removeKey(key: string, store: MappingStore, setStore: (s: MappingStore) => void) {
  const next = { ...store }; delete next[key]; setStore(next);
}

const ARTIKELGROEP_ALL_OPTS = [...new Set([
  ...ARTIKELGROEP_OPTIONS,
  ...Object.values(PRODUCTSOORT_TO_ARTIKELGROEP),
])].sort();

// ── row component ────────────────────────────────────────

interface RowProps {
  rowKey: string;
  store: MappingStore;
  setStore: (s: MappingStore) => void;
  datalistId: string;
  inFileValues: boolean;
}

const MappingRow = memo(function MappingRow({ rowKey, store, setStore, datalistId, inFileValues }: RowProps) {
  const { lang, t } = useLang();
  const ag = effectiveAg(rowKey, store);
  const eh = effectiveEh(rowKey, store);
  const unknown = inFileValues && !isMapped(rowKey, store);
  const custom = isCustomKey(rowKey, store);
  const inBuiltIn = rowKey in PRODUCTSOORT_TO_ARTIKELGROEP;
  const alias = !inBuiltIn && !custom ? englishAlias(rowKey) : undefined;

  const [localAg, setLocalAg] = useState(ag);
  const focusedRef = useRef(false);

  // Sync external changes (reset, import) without overwriting in-progress edits
  useEffect(() => {
    if (!focusedRef.current) setLocalAg(ag);
  }, [ag]);

  function commitAg() {
    writeEdit(rowKey, 'ag', localAg, store, setStore);
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0 3px 6px',
      borderLeft: unknown ? '3px solid var(--amber-text)'
        : custom ? '3px solid var(--green-dark)' : '3px solid transparent',
    }}>
      <span style={{ flex: '0 0 160px', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rowKey}>
        {rowKey}
      </span>
      <input
        type="text" list={datalistId} value={localAg}
        onChange={e => setLocalAg(e.target.value)}
        onFocus={() => { focusedRef.current = true; }}
        onBlur={() => { focusedRef.current = false; commitAg(); }}
        onKeyDown={e => { if (e.key === 'Enter') { commitAg(); (e.target as HTMLInputElement).blur(); } }}
        style={{ ...INPUT, flex: 1 }}
      />
      <datalist id={datalistId}>
        {ARTIKELGROEP_ALL_OPTS.map(o => <option key={o} value={o} />)}
      </datalist>
      <select value={eh} onChange={e => writeEdit(rowKey, 'eh', e.target.value, store, setStore)}
        style={{ ...INPUT, width: 68 }}>
        <option value="Stuks">Stuks</option>
        <option value="Paar">Paar</option>
      </select>
      <span style={{ width: 72, flexShrink: 0 }}>
        {unknown
          ? <span className="badge badge-amber">{t('meUnknown')}</span>
          : custom
            ? <span className="badge badge-green">{t('meCustomBadge')}</span>
            : alias
              ? <span className="badge badge-purple" title={`${lang === 'nl' ? 'Engels alias voor' : 'English alias for'} "${alias}"`}>EN → NL</span>
              : <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t('meBuiltIn')}</span>
        }
      </span>
      <span style={{ width: 52, flexShrink: 0 }}>
        {custom && (
          <button
            className="btn btn-sm"
            style={{ padding: '1px 6px', fontSize: 10, color: !inBuiltIn && !alias ? 'var(--red-text)' : undefined }}
            title={
              (inBuiltIn || alias)
                ? (lang === 'nl' ? 'Herstel naar standaard' : 'Reset to default')
                : (lang === 'nl' ? 'Verwijder toewijzing' : 'Remove assignment')
            }
            onClick={() => removeKey(rowKey, store, setStore)}
          >
            {(inBuiltIn || alias) ? t('meReset') : t('meDelete')}
          </button>
        )}
      </span>
    </div>
  );
});

function ColHeaders({ t }: { t: (k: string) => string }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '2px 6px', fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>
      <span style={{ flex: '0 0 160px' }}>Productsoort</span>
      <span style={{ flex: 1 }}>{t('meArtikelgroepCol')}</span>
      <span style={{ width: 68 }}>{t('meEenheidCol')}</span>
      <span style={{ width: 72 }}>{t('meStatusCol')}</span>
      <span style={{ width: 52 }} />
    </div>
  );
}

// ── modal ────────────────────────────────────────────────

interface MappingEditorProps {
  fileValues: string[];
  store: MappingStore;             // committed store from parent (read-only after mount)
  onApply: (s: MappingStore) => void; // called when user applies to session or saves to browser
  onClose: () => void;
}

export default function MappingEditor({ fileValues, store, onApply, onClose }: MappingEditorProps) {
  const { lang, t } = useLang();
  const importRef = useRef<HTMLInputElement>(null);

  // Internal working copy — edits stay here until Apply or Save is clicked
  const [localStore, setLocalStore] = useState<MappingStore>(store);

  const [showAll, setShowAll] = useState(false);
  const [sortByCustom, setSortByCustom] = useState(false);
  const [searchA, setSearchA] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [importError, setImportError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newAg, setNewAg] = useState('');
  const [newEh, setNewEh] = useState('Stuks');
  const [appliedFlash, setAppliedFlash] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmResetFile, setConfirmResetFile] = useState(false);
  const [confirmResetSectionB, setConfirmResetSectionB] = useState(false);
  const [sortByCustomAll, setSortByCustomAll] = useState(false);

  useEffect(() => { if (!appliedFlash) return; const id = setTimeout(() => setAppliedFlash(false), 2000); return () => clearTimeout(id); }, [appliedFlash]);
  useEffect(() => { if (!savedFlash) return; const id = setTimeout(() => setSavedFlash(false), 2000); return () => clearTimeout(id); }, [savedFlash]);
  useEffect(() => { if (!confirmResetFile) return; const id = setTimeout(() => setConfirmResetFile(false), 3000); return () => clearTimeout(id); }, [confirmResetFile]);
  useEffect(() => { if (!confirmResetSectionB) return; const id = setTimeout(() => setConfirmResetSectionB(false), 3000); return () => clearTimeout(id); }, [confirmResetSectionB]);

  // Lock background scroll
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleApply() {
    onApply(localStore);
    setAppliedFlash(true);
  }

  function handleSaveBrowser() {
    // Merge: ensure all unknown file values are persisted even if user didn't edit them.
    // Known (built-in/alias) file values are already handled by the built-in constants;
    // only save them if the user explicitly overrode them (they'll already be in localStore).
    const merged: MappingStore = { ...localStore };
    for (const key of fileValues) {
      if (isUnknownKey(key) && !(key in merged)) {
        merged[key] = { artikelgroep: defaultAg(key), eenheid: defaultEh(key) };
      }
    }
    saveMappingStore(merged);
    setLocalStore(merged);   // reflect immediately so Section B shows them as Custom
    onApply(merged);
    setSavedFlash(true);
  }

  /** Remove overrides only for keys present in the current supplier file */
  function handleResetFileValues() {
    if (!confirmResetFile) { setConfirmResetFile(true); return; }
    const fileSet = new Set(fileValues);
    setLocalStore(s => Object.fromEntries(Object.entries(s).filter(([key]) => !fileSet.has(key))));
    setConfirmResetFile(false);
  }

  /** Remove all overrides/custom entries for keys NOT in the current file — leaves Section A untouched */
  function handleResetSectionB() {
    if (!confirmResetSectionB) { setConfirmResetSectionB(true); return; }
    const fileSet = new Set(fileValues);
    setLocalStore(s => Object.fromEntries(Object.entries(s).filter(([key]) => fileSet.has(key))));
    setConfirmResetSectionB(false);
  }

  function addNew() {
    const k = newKey.trim();
    const a = newAg.trim();
    if (!k || !a) return;
    setLocalStore(s => ({ ...s, [k]: { artikelgroep: a, eenheid: newEh } }));
    setNewKey(''); setNewAg(''); setShowAdd(false);
  }

  function handleImport(file: File) {
    setImportError(false);
    importMappingStore(
      file,
      imported => setLocalStore(s => ({ ...s, ...imported })),
      () => setImportError(true),
    );
  }

  const customCount = Object.keys(localStore).length;
  const unknownCount = useMemo(
    () => fileValues.filter(v => !isMapped(v, localStore)).length,
    [fileValues, localStore],
  );

  // Sort rank: 0 = custom, 1 = unknown-in-file, 2 = built-in/alias
  function sortRank(key: string, inFile: boolean): number {
    if (isCustomKey(key, localStore)) return 0;
    if (inFile && !isMapped(key, localStore)) return 1;
    return 2;
  }

  const sortedFileValues = useMemo(() => {
    if (!sortByCustom) return fileValues;
    return [...fileValues].sort((a, b) => {
      const diff = sortRank(a, true) - sortRank(b, true);
      return diff !== 0 ? diff : a.localeCompare(b);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileValues, localStore, sortByCustom]);

  const allRows = useMemo(() => {
    const fileSet = new Set(fileValues);
    const keys = new Set([
      ...Object.keys(PRODUCTSOORT_TO_ARTIKELGROEP),
      ...Object.keys(localStore),
    ]);
    const base = [...keys].filter(k => !fileSet.has(k) || k in localStore);
    if (sortByCustomAll) {
      return base.sort((a, b) => {
        const diff = sortRank(a, false) - sortRank(b, false);
        return diff !== 0 ? diff : a.localeCompare(b);
      });
    }
    return base.sort((a, b) => a.localeCompare(b));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStore, fileValues, sortByCustomAll]);

  const filteredFileValues = useMemo(() => {
    if (!searchA.trim()) return sortedFileValues;
    const q = searchA.toLowerCase();
    return sortedFileValues.filter(k =>
      k.toLowerCase().includes(q) ||
      effectiveAg(k, localStore).toLowerCase().includes(q),
    );
  }, [sortedFileValues, searchA, localStore]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.toLowerCase();
    return allRows.filter(k =>
      k.toLowerCase().includes(q) ||
      effectiveAg(k, localStore).toLowerCase().includes(q),
    );
  }, [allRows, search, localStore]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageKeys = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="modal-head-title">{t('meMappingCardTitle')}</span>
            {customCount > 0 && <span className="badge badge-green">{customCount} {t('meCustom')}</span>}
            {unknownCount > 0 && <span className="badge badge-amber">{unknownCount} {t('meUnknown')}</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => exportMappingStore(localStore)}>{t('meExport')}</button>
            <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => importRef.current?.click()}>{t('meImport')}</button>
            <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ''; }} />
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 0, marginBottom: 12 }}>
            {t('meMappingCardDesc')}
          </p>

          {importError && <Banner type="warning" icon="✗" message={t('meImportErr')} />}

          {/* Section A: file values */}
          {fileValues.length > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {t('meFileValuesTitle')}
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 6 }}>
                    ({fileValues.length} {lang === 'nl' ? 'unieke waarden' : 'unique values'})
                  </span>
                </span>
                <button
                  className="btn btn-sm"
                  style={{ fontSize: 10, marginLeft: 'auto', color: sortByCustom ? 'var(--green-dark)' : undefined, borderColor: sortByCustom ? 'var(--green-dark)' : undefined }}
                  onClick={() => setSortByCustom(v => !v)}
                >
                  {sortByCustom ? (lang === 'nl' ? '↕ Alfabetisch' : '↕ Alphabetical') : (lang === 'nl' ? '↕ Aangepast eerst' : '↕ Custom first')}
                </button>
                <button
                  className="btn btn-sm"
                  style={{ fontSize: 10, color: confirmResetFile ? 'var(--red-text)' : 'var(--text-secondary)', borderColor: confirmResetFile ? 'var(--red-text)' : undefined }}
                  title={lang === 'nl' ? 'Verwijdert aanpassingen voor productsoorten in dit bestand.' : 'Removes overrides for product types in this file.'}
                  onClick={handleResetFileValues}
                >
                  {confirmResetFile ? (lang === 'nl' ? 'Bevestigen?' : 'Confirm?') : (lang === 'nl' ? '↺ Reset' : '↺ Reset')}
                </button>
              </div>
              <input
                type="text" value={searchA}
                onChange={e => setSearchA(e.target.value)}
                placeholder={lang === 'nl' ? 'Zoeken…' : 'Search…'}
                style={{ width: '100%', fontSize: 12, padding: '4px 8px', border: '0.5px solid var(--border-md)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', marginBottom: 6, boxSizing: 'border-box' }}
              />
              {unknownCount > 0 && (
                <Banner type="warning" icon="⚠"
                  message={
                    lang === 'nl'
                      ? `<strong>${unknownCount} productsoort${unknownCount === 1 ? '' : 'en'} niet gevonden in de koppeling</strong> — wijs ze hieronder toe of de standaard <strong>"${DEFAULT_ARTIKELGROEP}"</strong> wordt gebruikt.`
                      : `<strong>${unknownCount} product type${unknownCount === 1 ? '' : 's'} not found in mapping</strong> — assign them below or the default <strong>"${DEFAULT_ARTIKELGROEP}"</strong> will be used.`
                  }
                />
              )}
              <ColHeaders t={t} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12, maxHeight: 280, overflowY: 'auto' }}>
                {filteredFileValues.length === 0
                  ? <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0' }}>
                      {lang === 'nl' ? `Geen resultaten voor "${searchA}".` : `No results for "${searchA}".`}
                    </div>
                  : filteredFileValues.map((key, i) => (
                    <MappingRow key={key} rowKey={key} store={localStore} setStore={setLocalStore}
                      datalistId={`ag-file-${i}`} inFileValues />
                  ))
                }
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {lang === 'nl'
                ? 'Selecteer een Productsoort-kolom om de waarden in dit bestand te zien.'
                : 'Select a Productsoort column to see the values in this file.'}
            </p>
          )}

          {/* Section B toggle */}
          <button className="btn btn-sm" style={{ fontSize: 11, marginBottom: showAll ? 10 : 0 }}
            onClick={() => setShowAll(v => !v)}>
            {showAll ? t('meHideAll') : t('meShowAll')}
          </button>

          {/* Section B: all other mappings */}
          {showAll && (
            <>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, marginBottom: 8, alignItems: 'center' }}>
                <input type="text" value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  placeholder={t('meSearch')}
                  style={{ flex: 1, fontSize: 12, padding: '4px 8px', border: '0.5px solid var(--border-md)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }}
                />
                <button className="btn btn-sm" style={{ fontSize: 11, flexShrink: 0 }}
                  onClick={() => { setShowAdd(v => !v); setNewKey(''); setNewAg(''); }}>
                  {showAdd ? (lang === 'nl' ? '— Annuleren' : '— Cancel') : '＋ ' + t('meAddNew')}
                </button>
              </div>

              {/* Sort + reset for Section B */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="btn btn-sm"
                  style={{ fontSize: 10, color: sortByCustomAll ? 'var(--green-dark)' : undefined, borderColor: sortByCustomAll ? 'var(--green-dark)' : undefined }}
                  onClick={() => setSortByCustomAll(v => !v)}
                >
                  {sortByCustomAll ? (lang === 'nl' ? '↕ Alfabetisch' : '↕ Alphabetical') : (lang === 'nl' ? '↕ Aangepast eerst' : '↕ Custom first')}
                </button>
                <button
                  className="btn btn-sm"
                  style={{ fontSize: 10, color: confirmResetSectionB ? 'var(--red-text)' : 'var(--text-secondary)', borderColor: confirmResetSectionB ? 'var(--red-text)' : undefined }}
                  title={lang === 'nl' ? 'Verwijdert alle aanpassingen in "Alle koppelingen" zonder de huidige leverancier te beïnvloeden.' : 'Resets all mappings in this section to defaults — does not affect the current supplier file.'}
                  onClick={handleResetSectionB}
                >
                  {confirmResetSectionB ? (lang === 'nl' ? 'Bevestigen?' : 'Confirm?') : (lang === 'nl' ? '↺ Standaard herstellen' : '↺ Reset to defaults')}
                </button>
              </div>

              {showAdd && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, padding: '8px 10px', background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" value={newKey} onChange={e => setNewKey(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addNew(); }}
                    placeholder={t('meNewProductsoort')} style={{ ...INPUT, flex: '1 1 150px' }} />
                  <input type="text" list="add-ag-datalist" value={newAg} onChange={e => setNewAg(e.target.value)}
                    placeholder={t('meArtikelgroepCol')} style={{ ...INPUT, flex: '1 1 140px' }} />
                  <datalist id="add-ag-datalist">
                    {ARTIKELGROEP_ALL_OPTS.map(o => <option key={o} value={o} />)}
                  </datalist>
                  <select value={newEh} onChange={e => setNewEh(e.target.value)} style={{ ...INPUT, width: 70 }}>
                    <option value="Stuks">Stuks</option>
                    <option value="Paar">Paar</option>
                  </select>
                  <button className="btn btn-sm btn-primary" style={{ fontSize: 11 }} onClick={addNew}>{t('meAdd')}</button>
                </div>
              )}

              <ColHeaders t={t} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {pageKeys.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '6px 0' }}>
                    {lang === 'nl' ? `Geen resultaten voor "${search}".` : `No results for "${search}".`}
                  </div>
                ) : pageKeys.map((key, i) => (
                  <MappingRow key={key} rowKey={key} store={localStore} setStore={setLocalStore}
                    datalistId={`ag-all-${safePage}-${i}`} inFileValues={false} />
                ))}
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--border)' }}>
                  <button className="btn btn-sm" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}>‹</button>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {safePage + 1} / {totalPages} · {filtered.length} {lang === 'nl' ? 'resultaten' : 'results'}
                  </span>
                  <button className="btn btn-sm" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — explicit apply / save actions */}
        <div className="modal-foot">
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {lang === 'nl'
              ? 'Toepassen = alleen deze sessie · Opslaan = permanent + zichtbaar in Alle koppelingen'
              : 'Apply = this session only · Save = permanent + visible in Manage all mappings'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" style={{ fontSize: 11, minWidth: 130 }} onClick={handleApply}>
              {appliedFlash ? (lang === 'nl' ? '✓ Toegepast' : '✓ Applied') : t('meApplySession')}
            </button>
            <button className="btn btn-sm btn-primary" style={{ fontSize: 11, minWidth: 130 }} onClick={handleSaveBrowser}>
              {savedFlash ? (lang === 'nl' ? '✓ Opgeslagen' : '✓ Saved') : t('meSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
