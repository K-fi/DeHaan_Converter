import { useState, useRef, useEffect } from 'react';
import { readFileRaw, sheetTo2D } from '../utils/xlsx';
import { detectHeaderRow, parseFromHeaderRow } from '../utils/headers';
import { useLang } from '../context/LangContext';
import PreviewTable from './PreviewTable';
import Banner from './Banner';
import type { ParsedFile, BannerInfo } from '../types';
import type { WorkBook, WorkSheet } from 'xlsx';

interface FileUploadCardProps {
  title: string;
  icon: string;
  onFileLoaded: (file: ParsedFile) => void;
  initialFile?: ParsedFile | null;
}

export default function FileUploadCard({ title, icon, onFileLoaded, initialFile }: FileUploadCardProps) {
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerInfo | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [headerRowNum, setHeaderRowNum] = useState(1);
  const [preview, setPreview] = useState<{ cols: string[]; data: Record<string, unknown>[] } | null>(null);

  const { lang, t } = useLang();

  const workbookRef = useRef<WorkBook | null>(null);
  const rawSheetRef = useRef<WorkSheet | null>(null);
  const fileNameRef = useRef('');

  useEffect(() => {
    if (!initialFile) return;
    workbookRef.current = initialFile.workbook;
    rawSheetRef.current = initialFile.rawSheet;
    fileNameRef.current = initialFile.fileName;
    const isMulti = initialFile.workbook.SheetNames.length > 1;
    if (isMulti) setSheets(initialFile.workbook.SheetNames);
    setUploadedName('✓ ' + initialFile.fileName);
    setPreview({ cols: initialFile.cols, data: initialFile.data });
    setBanner({
      type: 'success',
      icon: '✓',
      message: lang === 'nl'
        ? `<strong>${initialFile.cols.length} kolommen</strong> en <strong>${initialFile.data.length} rijen</strong> gevonden.`
        : `Found <strong>${initialFile.cols.length} columns</strong> and <strong>${initialFile.data.length} rows</strong>.`,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applySheet(wb: WorkBook, sheetName: string, isMulti: boolean) {
    const ws = wb.Sheets[sheetName];
    rawSheetRef.current = ws;
    const rows = sheetTo2D(ws);
    const hIdx = detectHeaderRow(rows);
    const parsed = parseFromHeaderRow(rows, hIdx);
    setHeaderRowNum(hIdx + 1);
    setPreview({ cols: parsed.cols, data: parsed.data });
    const suffix = isMulti ? ` [${sheetName}]` : '';
    setUploadedName('✓ ' + fileNameRef.current + suffix);
    setBanner({
      type: 'success',
      icon: '✓',
      message: lang === 'nl'
        ? `Koptekst op rij <strong>${hIdx + 1}</strong>. <strong>${parsed.cols.length} kolommen</strong> en <strong>${parsed.data.length} rijen</strong> gevonden.`
        : `Header on row <strong>${hIdx + 1}</strong>. Found <strong>${parsed.cols.length} columns</strong> and <strong>${parsed.data.length} rows</strong>.`,
    });
    onFileLoaded({ data: parsed.data, cols: parsed.cols, rawSheet: ws, workbook: wb, fileName: fileNameRef.current });
  }

  function handleFile(file: File) {
    fileNameRef.current = file.name;
    readFileRaw(file, (wb) => {
      workbookRef.current = wb;
      const isMulti = wb.SheetNames.length > 1;
      if (isMulti) {
        setSheets(wb.SheetNames);
        setBanner({
          type: 'info',
          icon: '📑',
          message: lang === 'nl'
            ? `Dit bestand heeft <strong>${wb.SheetNames.length} tabbladen</strong>. Selecteer het tabblad hieronder.`
            : `This file has <strong>${wb.SheetNames.length} sheets</strong>. Select the tab you want to use below.`,
        });
      } else {
        setSheets([]);
      }
      applySheet(wb, wb.SheetNames[0], isMulti);
    });
  }

  function handleSheetChange(sheetName: string) {
    if (!workbookRef.current) return;
    applySheet(workbookRef.current, sheetName, true);
  }

  function handleRedetect() {
    if (!rawSheetRef.current) return;
    const idx = Math.max(0, headerRowNum - 1);
    const rows = sheetTo2D(rawSheetRef.current);
    const parsed = parseFromHeaderRow(rows, idx);
    setPreview({ cols: parsed.cols, data: parsed.data });
    setBanner({
      type: 'info',
      icon: 'ℹ',
      message: lang === 'nl'
        ? `Rij <strong>${idx + 1}</strong> gebruikt. <strong>${parsed.cols.length} kolommen</strong> en <strong>${parsed.data.length} rijen</strong> gevonden.`
        : `Using row <strong>${idx + 1}</strong>. Found <strong>${parsed.cols.length} columns</strong> and <strong>${parsed.data.length} rows</strong>.`,
    });
    onFileLoaded({ data: parsed.data, cols: parsed.cols, rawSheet: rawSheetRef.current, workbook: workbookRef.current!, fileName: fileNameRef.current });
  }

  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <label
        className={`upload-zone${uploadedName ? ' has-file' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        <span className="upload-icon">{icon}</span>
        <div className="upload-label"><strong>{t('fuClickUpload')}</strong> {t('fuOrDrop')}</div>
        <div className="file-formats">.xlsx · .xls · .xlsm · .ods · .csv · .tsv</div>
        {uploadedName && <div className="file-name">{uploadedName}</div>}
        <input
          type="file"
          accept=".xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv,.txt"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </label>

      {banner && <Banner {...banner} />}

      {sheets.length > 1 && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>{t('fuSheetLabel')}:</span>
          <select style={{ flex: 1, fontSize: 12, padding: '5px 8px' }} onChange={(e) => handleSheetChange(e.target.value)}>
            {sheets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {uploadedName && (
        <div className="header-row-selector">
          <span>{t('fuHeaderOnRow')}:</span>
          <input
            type="number"
            min="1"
            value={headerRowNum}
            onChange={(e) => setHeaderRowNum(parseInt(e.target.value, 10) || 1)}
          />
          <button className="btn btn-sm" onClick={handleRedetect}>{t('fuApply')}</button>
        </div>
      )}

      {preview && <PreviewTable cols={preview.cols} data={preview.data} />}
    </div>
  );
}
