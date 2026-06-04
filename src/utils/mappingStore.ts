import {
  PRODUCTSOORT_TO_ARTIKELGROEP,
  PRODUCTSOORT_TO_EENHEID,
  ENGLISH_TO_DUTCH_PRODUCTSOORT,
  DEFAULT_ARTIKELGROEP,
  DEFAULT_EENHEID,
} from '../constants/converterMappings';

export interface CustomEntry {
  artikelgroep: string;
  eenheid: string;
}

export type MappingStore = Record<string, CustomEntry>;

const LS_KEY = 'dehaan_mapping_store_v1';

export function loadMappingStore(): MappingStore {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as MappingStore) : {};
  } catch {
    return {};
  }
}

export function saveMappingStore(store: MappingStore): void {
  localStorage.setItem(LS_KEY, JSON.stringify(store));
}

export function exportMappingStore(store: MappingStore): void {
  const blob = new Blob(
    [JSON.stringify({ version: 1, mappings: store }, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'productsoort_mappings.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importMappingStore(
  file: File,
  cb: (store: MappingStore) => void,
  onError: () => void,
): void {
  const r = new FileReader();
  r.onload = e => {
    try {
      const data = JSON.parse(e.target!.result as string) as Record<string, unknown>;
      const raw = (data.mappings ?? data.customMappings ?? data) as MappingStore;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) cb(raw);
      else onError();
    } catch {
      onError();
    }
  };
  r.onerror = onError;
  r.readAsText(file);
}

// ── internal helpers ─────────────────────────────────────

/** Case-insensitive lookup against the built-in Dutch table. Returns the Dutch key or undefined. */
function findBuiltInKey(productsoort: string): string | undefined {
  if (productsoort in PRODUCTSOORT_TO_ARTIKELGROEP) return productsoort;
  const lower = productsoort.toLowerCase();
  return Object.keys(PRODUCTSOORT_TO_ARTIKELGROEP).find(k => k.toLowerCase() === lower);
}

/** English→Dutch alias lookup (exact then case-insensitive). Returns the Dutch key or undefined. */
function findEnglishAlias(productsoort: string): string | undefined {
  const nl = ENGLISH_TO_DUTCH_PRODUCTSOORT[productsoort];
  if (nl) return nl;
  const lower = productsoort.toLowerCase();
  const enKey = Object.keys(ENGLISH_TO_DUTCH_PRODUCTSOORT).find(k => k.toLowerCase() === lower);
  return enKey ? ENGLISH_TO_DUTCH_PRODUCTSOORT[enKey] : undefined;
}

// ── public resolution functions ──────────────────────────

/**
 * Full resolution chain for Artikelgroep:
 * 1. Custom store — exact match
 * 2. Built-in — exact match
 * 3. Built-in — case-insensitive match
 * 4. English alias → built-in lookup
 * 5. Custom store — case-insensitive match
 * 6. Default fallback
 */
export function resolveArtikelgroep(productsoort: string, store: MappingStore): string {
  if (store[productsoort]?.artikelgroep) return store[productsoort].artikelgroep;

  const builtKey = findBuiltInKey(productsoort);
  if (builtKey) return PRODUCTSOORT_TO_ARTIKELGROEP[builtKey];

  const dutchKey = findEnglishAlias(productsoort);
  if (dutchKey && PRODUCTSOORT_TO_ARTIKELGROEP[dutchKey]) return PRODUCTSOORT_TO_ARTIKELGROEP[dutchKey];

  const lower = productsoort.toLowerCase();
  const storeKey = Object.keys(store).find(k => k.toLowerCase() === lower && store[k].artikelgroep);
  if (storeKey) return store[storeKey].artikelgroep;

  return DEFAULT_ARTIKELGROEP;
}

/**
 * Full resolution chain for Eenheid — same order as Artikelgroep.
 */
export function resolveEenheid(productsoort: string, store: MappingStore): string {
  if (store[productsoort]?.eenheid) return store[productsoort].eenheid;

  const builtKey = findBuiltInKey(productsoort);
  if (builtKey) return PRODUCTSOORT_TO_EENHEID[builtKey] ?? DEFAULT_EENHEID;

  const dutchKey = findEnglishAlias(productsoort);
  if (dutchKey && PRODUCTSOORT_TO_EENHEID[dutchKey]) return PRODUCTSOORT_TO_EENHEID[dutchKey];

  const lower = productsoort.toLowerCase();
  const storeKey = Object.keys(store).find(k => k.toLowerCase() === lower && store[k].eenheid);
  if (storeKey) return store[storeKey].eenheid;

  return DEFAULT_EENHEID;
}

/**
 * True if the value has any mapping via:
 * exact/case-insensitive built-in, English alias, or custom store.
 */
export function isMapped(productsoort: string, store: MappingStore): boolean {
  if (productsoort in store) return true;
  if (findBuiltInKey(productsoort)) return true;
  if (findEnglishAlias(productsoort)) return true;
  const lower = productsoort.toLowerCase();
  return Object.keys(store).some(k => k.toLowerCase() === lower);
}
