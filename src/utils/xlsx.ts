import * as XLSX from 'xlsx';

export function readFileRaw(file: File, cb: (wb: XLSX.WorkBook) => void, onError?: () => void): void {
  const r = new FileReader();
  const isText = /\.(csv|tsv|txt)$/i.test(file.name);

  r.onload = (e: ProgressEvent<FileReader>) => {
    const buf = e.target!.result as ArrayBuffer;
    // Defer heavy XLSX.read so any pending loading-state paint can flush first
    setTimeout(() => {
      try {
        let wb: XLSX.WorkBook;
        if (isText) {
          // Decode bytes manually so we handle UTF-16 LE/BE BOM (Windows CSV exports)
          // as well as plain UTF-8/ASCII — then let SheetJS parse the clean string.
          const bytes = new Uint8Array(buf);
          let text: string;
          if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
            text = new TextDecoder('utf-16le').decode(buf.slice(2));
          } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
            text = new TextDecoder('utf-16be').decode(buf.slice(2));
          } else {
            text = new TextDecoder('utf-8').decode(buf);
          }
          // Quote bare 16+ digit sequences before SheetJS sees them.
          // Numbers with ≥ 16 digits can exceed Number.MAX_SAFE_INTEGER and get
          // rounded to trailing zeros (e.g. SSCC barcodes are 18 digits).
          text = text.replace(/(^|[,;\t])(\d{16,})(?=[,;\t\r\n]|$)/gm, '$1"$2"');
          wb = XLSX.read(text, { type: 'string', raw: false });
        } else {
          wb = XLSX.read(buf, { type: 'array', cellDates: true, raw: false });
        }
        cb(wb);
      } catch {
        onError?.();
      }
    }, 0);
  };
  r.onerror = () => onError?.();
  r.readAsArrayBuffer(file);
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
          // Prefer cell.w when it's a plain digit string (preserves leading zeros).
          // Fall back to String(cell.v) when cell.w is scientific notation or absent.
          const w = cell.w;
          val = (typeof w === 'string' && /^\d+$/.test(w)) ? w : String(cell.v);
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
