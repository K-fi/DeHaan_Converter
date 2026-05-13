import { ALL_HINTS } from './columns';

export function scoreRow(row: unknown[]): number {
  let score = 0, nonEmpty = 0;
  row.forEach(cell => {
    const v = String(cell).toLowerCase().trim().replace(/[\s_-]/g, '');
    if (v) nonEmpty++;
    ALL_HINTS.forEach(h => { if (v.includes(h)) score++; });
    if (v && v.length < 40 && !/^\d+$/.test(v)) score += 0.2;
  });
  if (nonEmpty < 2) score = 0;
  return score;
}

export function detectHeaderRow(rows: unknown[][]): number {
  if (!rows.length) return 0;
  let best = 0, bs = -1;
  const lim = Math.min(rows.length, 20);
  for (let i = 0; i < lim; i++) {
    const s = scoreRow(rows[i]);
    if (s > bs) { bs = s; best = i; }
  }
  return best;
}

export function parseFromHeaderRow(
  rows: unknown[][],
  idx: number,
): { cols: string[]; data: Record<string, unknown>[] } {
  const hrow = rows[idx];
  if (!hrow) return { cols: [], data: [] };
  const seen: Record<string, number> = {};
  const cols = hrow.map(c => {
    let n = String(c).trim() || ('Col' + Math.random().toString(36).slice(2, 5));
    if (seen[n]) { seen[n]++; n = n + '_' + seen[n]; } else { seen[n] = 1; }
    return n;
  });
  const data: Record<string, unknown>[] = [];
  for (let r = idx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every(v => String(v).trim() === '')) continue;
    const obj: Record<string, unknown> = {};
    cols.forEach((col, ci) => { obj[col] = row[ci] !== undefined ? row[ci] : ''; });
    data.push(obj);
  }
  return { cols, data };
}
