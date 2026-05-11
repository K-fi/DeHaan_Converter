'use client';

import { useState, useEffect } from 'react';
import { useLang } from '../context/LangContext';

const PAGE_COLS = 5;
const PAGE_ROWS = 5;

interface PreviewTableProps {
  cols: string[];
  data: Record<string, unknown>[];
}

export default function PreviewTable({ cols, data }: PreviewTableProps) {
  const [page, setPage] = useState(0);
  const { lang } = useLang();

  useEffect(() => setPage(0), [cols]);

  if (!cols || cols.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(cols.length / PAGE_COLS));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_COLS;
  const visCols = cols.slice(start, start + PAGE_COLS);
  const visRows = data.slice(0, PAGE_ROWS);

  const infoText = lang === 'nl'
    ? `${data.length} rijen · ${cols.length} kolommen · getoond ${start + 1}–${Math.min(start + PAGE_COLS, cols.length)}`
    : `${data.length} rows · ${cols.length} cols · showing ${start + 1}–${Math.min(start + PAGE_COLS, cols.length)}`;

  return (
    <div className="preview-outer">
      <div className="preview-toolbar">
        <span className="preview-info">{infoText}</span>
        {totalPages > 1 && (
          <div className="preview-pager">
            <button disabled={safePage === 0} onClick={() => setPage(p => p - 1)}>‹</button>
            <span className="pg-label">{safePage + 1} / {totalPages}</span>
            <button disabled={safePage >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>
      <div className="preview-scroll">
        <table>
          <thead>
            <tr>{visCols.map(c => <th key={c} title={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {visRows.map((row, i) => (
              <tr key={i}>
                {visCols.map(c => {
                  const v = String(row[c] ?? '');
                  return <td key={c} title={v}>{v}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
