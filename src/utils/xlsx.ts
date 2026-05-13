import * as XLSX from 'xlsx';

export function readFileRaw(file: File, cb: (wb: XLSX.WorkBook) => void, onError?: () => void): void {
  const r = new FileReader();
  const isText = /\.(csv|tsv|txt)$/i.test(file.name);
  r.onload = (e: ProgressEvent<FileReader>) => {
    const result = e.target!.result;
    // Defer heavy XLSX.read so any pending loading-state paint can flush first
    setTimeout(() => {
      try {
        const wb = isText
          ? XLSX.read(result as string, { type: 'string', raw: false })
          : XLSX.read(result as ArrayBuffer, { type: 'array', cellDates: true, raw: false });
        cb(wb);
      } catch {
        onError?.();
      }
    }, 0);
  };
  r.onerror = () => onError?.();
  isText ? r.readAsText(file) : r.readAsArrayBuffer(file);
}

export function sheetTo2D(ws: XLSX.WorkSheet | undefined | null): unknown[][] {
  if (!ws) return [];
  const rng = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:A1');
  const rows: unknown[][] = [];
  for (let r = rng.s.r; r <= rng.e.r; r++) {
    const row: unknown[] = [];
    for (let c = rng.s.c; c <= rng.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      let val: unknown = '';
      if (cell) {
        if (cell.t === 'n' && cell.v !== undefined && Number.isFinite(cell.v) && cell.v === Math.floor(cell.v)) {
          val = String(cell.v);
        } else {
          val = cell.w !== undefined ? cell.w : (cell.v !== undefined ? cell.v : '');
        }
      }
      row.push(val);
    }
    rows.push(row);
  }
  return rows;
}

export function downloadXLSX(data: Record<string, unknown>[], cols: string[], filename: string, sheetName = 'Sheet1'): void {
  const ws = XLSX.utils.json_to_sheet(data, { header: cols });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename, { bookType: 'csv' });
}
