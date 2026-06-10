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

function isValidStore(v: unknown): v is MappingStore {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  return Object.values(v as Record<string, unknown>).every(
    e => e && typeof e === 'object' && !Array.isArray(e) &&
         typeof (e as Record<string, unknown>).artikelgroep === 'string' &&
         typeof (e as Record<string, unknown>).eenheid === 'string',
  );
}

export function loadMappingStore(): MappingStore {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isValidStore(parsed) ? parsed : {};
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
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
      const raw = data.mappings ?? data.customMappings ?? data;
      if (isValidStore(raw)) cb(raw);
      else onError();
    } catch {
      onError();
    }
  };
  r.onerror = onError;
  r.readAsText(file);
}

// ── internal helpers ─────────────────────────────────────

const norm = (s: string) => s.toLowerCase().replace(/[\s_\-/]/g, '');

/**
 * Substring fallback: built-in key is contained in the input (compound words) or
 * vice-versa (stem/singular).  E.g. "Veiligheidshandschoenen" → "Handschoenen";
 * "Helm" is inside "Helmen".  Prefers longest match.
 */
function findBySubstring(productsoort: string): string | undefined {
  const lo = norm(productsoort);
  if (lo.length < 4) return undefined;
  const keys = Object.keys(PRODUCTSOORT_TO_ARTIKELGROEP);
  const inInput = keys
    .filter(k => k.length >= 5 && lo.includes(norm(k)))
    .sort((a, b) => b.length - a.length);
  if (inInput.length) return inInput[0];
  const inKey = keys
    .filter(k => k.length >= 5 && norm(k).includes(lo) && lo.length >= 4)
    .sort((a, b) => a.length - b.length);
  return inKey[0];
}

/**
 * Token matching: split multi-word inputs on whitespace/punctuation and exact-match
 * each token against both the Dutch built-in table and the English alias table.
 * E.g. "Work Safety Gloves" → token "Gloves" → "Handschoenen".
 * Skips single-word inputs — those are fully covered by earlier steps.
 */
function findByTokens(productsoort: string): string | undefined {
  const tokens = productsoort
    .split(/[\s,/:;\-_&()+]+/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length >= 3);
  if (tokens.length < 2) return undefined;

  for (const t of tokens) {
    const dk = Object.keys(PRODUCTSOORT_TO_ARTIKELGROEP).find(k => k.toLowerCase() === t);
    if (dk) return dk;
    const ek = Object.keys(ENGLISH_TO_DUTCH_PRODUCTSOORT).find(k => k.toLowerCase() === t);
    if (ek) return ENGLISH_TO_DUTCH_PRODUCTSOORT[ek];
  }
  return undefined;
}

// Single-row Levenshtein (O(n) space)
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[n];
}

// Max allowed edits scaled to word length to avoid false positives on short words
function editThreshold(len: number): number {
  if (len <= 4) return 1;
  if (len <= 7) return 2;
  return 3;
}

// Cache: these helpers only read static built-in tables so results never change per input.
const _levCache = new Map<string, string | undefined>();

/**
 * Levenshtein fallback: find the closest Dutch key or English alias within the
 * edit threshold.  Runs last so it only fires when all structural matches fail.
 * E.g. "Handschoem" (typo) → dist 3 to "Handschoenen" → resolved.
 * Cached so large files pay the cost once per unique value, not once per row.
 */
function findByLevenshtein(productsoort: string): string | undefined {
  if (_levCache.has(productsoort)) return _levCache.get(productsoort);

  const lo = productsoort.toLowerCase();
  let result: string | undefined;

  if (lo.length >= 4) {
    const threshold = editThreshold(lo.length);
    let bestKey: string | undefined;
    let bestDist = threshold + 1;
    let bestIsEnglish = false;

    for (const k of Object.keys(PRODUCTSOORT_TO_ARTIKELGROEP)) {
      const d = levenshtein(lo, k.toLowerCase());
      if (d < bestDist) { bestDist = d; bestKey = k; bestIsEnglish = false; }
    }
    for (const k of Object.keys(ENGLISH_TO_DUTCH_PRODUCTSOORT)) {
      const d = levenshtein(lo, k.toLowerCase());
      if (d < bestDist) { bestDist = d; bestKey = k; bestIsEnglish = true; }
    }
    if (bestKey) {
      result = bestIsEnglish ? ENGLISH_TO_DUTCH_PRODUCTSOORT[bestKey] : bestKey;
    }
  }

  _levCache.set(productsoort, result);
  return result;
}

/** Case-insensitive lookup against the built-in Dutch table. Returns the Dutch key or undefined. */
function findBuiltInKey(productsoort: string): string | undefined {
  if (productsoort in PRODUCTSOORT_TO_ARTIKELGROEP) return productsoort;
  const lower = productsoort.toLowerCase();
  return Object.keys(PRODUCTSOORT_TO_ARTIKELGROEP).find(k => k.toLowerCase() === lower);
}

/** English→Dutch alias lookup (exact then case-insensitive). Returns the Dutch Productsoort name or undefined. */
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
 * 2. Built-in — exact / case-insensitive
 * 3. English/German/French alias
 * 4. Substring / stem match
 * 5. Token match (multi-word inputs)
 * 6. Levenshtein typo correction
 * 7. Custom store — case-insensitive
 * 8. Default fallback
 */
export function resolveArtikelgroep(productsoort: string, store: MappingStore): string {
  if (store[productsoort]?.artikelgroep) return store[productsoort].artikelgroep;

  const builtKey = findBuiltInKey(productsoort);
  if (builtKey) return PRODUCTSOORT_TO_ARTIKELGROEP[builtKey];

  const aliasKey = findEnglishAlias(productsoort);
  if (aliasKey && PRODUCTSOORT_TO_ARTIKELGROEP[aliasKey]) return PRODUCTSOORT_TO_ARTIKELGROEP[aliasKey];

  const subKey = findBySubstring(productsoort);
  if (subKey) return PRODUCTSOORT_TO_ARTIKELGROEP[subKey];

  const tokenKey = findByTokens(productsoort);
  if (tokenKey) return PRODUCTSOORT_TO_ARTIKELGROEP[tokenKey] ?? DEFAULT_ARTIKELGROEP;

  const levKey = findByLevenshtein(productsoort);
  if (levKey) return PRODUCTSOORT_TO_ARTIKELGROEP[levKey] ?? DEFAULT_ARTIKELGROEP;

  const lower = productsoort.toLowerCase();
  const storeKey = Object.keys(store).find(k => k.toLowerCase() === lower && store[k].artikelgroep);
  if (storeKey) return store[storeKey].artikelgroep;

  return DEFAULT_ARTIKELGROEP;
}

/**
 * Full resolution chain for Eenheid — mirrors Artikelgroep order exactly.
 */
export function resolveEenheid(productsoort: string, store: MappingStore): string {
  if (store[productsoort]?.eenheid) return store[productsoort].eenheid;

  const builtKey = findBuiltInKey(productsoort);
  if (builtKey) return PRODUCTSOORT_TO_EENHEID[builtKey] ?? DEFAULT_EENHEID;

  const aliasKey = findEnglishAlias(productsoort);
  if (aliasKey && PRODUCTSOORT_TO_EENHEID[aliasKey]) return PRODUCTSOORT_TO_EENHEID[aliasKey];

  const subKey = findBySubstring(productsoort);
  if (subKey) return PRODUCTSOORT_TO_EENHEID[subKey] ?? DEFAULT_EENHEID;

  const tokenKey = findByTokens(productsoort);
  if (tokenKey) return PRODUCTSOORT_TO_EENHEID[tokenKey] ?? DEFAULT_EENHEID;

  const levKey = findByLevenshtein(productsoort);
  if (levKey) return PRODUCTSOORT_TO_EENHEID[levKey] ?? DEFAULT_EENHEID;

  const lower = productsoort.toLowerCase();
  const storeKey = Object.keys(store).find(k => k.toLowerCase() === lower && store[k].eenheid);
  if (storeKey) return store[storeKey].eenheid;

  return DEFAULT_EENHEID;
}

/**
 * True if the value resolves via any step in the chain above the default fallback.
 */
export function isMapped(productsoort: string, store: MappingStore): boolean {
  if (productsoort in store) return true;
  if (findBuiltInKey(productsoort)) return true;
  if (findEnglishAlias(productsoort)) return true;
  if (findBySubstring(productsoort)) return true;
  if (findByTokens(productsoort)) return true;
  if (findByLevenshtein(productsoort)) return true;
  const lower = productsoort.toLowerCase();
  return Object.keys(store).some(k => k.toLowerCase() === lower);
}
