export function looksLikeEan(v: unknown): boolean {
  return /^\d{8,14}$/.test(String(v).replace(/\s/g, ''));
}

export function normalizeEan(v: unknown): string {
  let s = String(v == null ? '' : v).trim();
  if (/^[\d.]+[eE][+-]?\d+$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) s = String(Math.round(n));
  }
  return s;
}

export function fmtDate(iso: string): string {
  if (!iso) return iso;
  const p = iso.split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0].slice(2) : iso;
}
