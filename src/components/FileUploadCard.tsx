'use client';

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
  const [isCsvFile, setIsCsvFile] = useState(false);
  const [sheets, setSheets] = useState<string[]>([]);
  const [headerRowNum, setHeaderRowNum] = useState(1);
  const [preview, setPreview] = useState<{ cols: string[]; data: Record<string, unknown>[] } | null>(null);
  const [parsing, setParsing] = useState(false);

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
    const bigFile = parsed.data.length > 100000;
    const rowWarning = bigFile ? (lang === 'nl' ? ' Groot bestand — verwerking kan enige tijd duren.' : ' Large file — processing may take a moment.') : '';
    setBanner({
      type: bigFile ? 'warning' : 'success',
      icon: bigFile ? '⚠' : '✓',
      message: lang === 'nl'
        ? `Koptekst op rij <strong>${hIdx + 1}</strong>. <strong>${parsed.cols.length} kolommen</strong> en <strong>${parsed.data.length} rijen</strong> gevonden.${rowWarning}`
        : `Header on row <strong>${hIdx + 1}</strong>. Found <strong>${parsed.cols.length} columns</strong> and <strong>${parsed.data.length} rows</strong>.${rowWarning}`,
    });
    onFileLoaded({ data: parsed.data, cols: parsed.cols, rawSheet: ws, workbook: wb, fileName: fileNameRef.current });
  }

  const MAX_FILE_MB = 100;

  function handleFile(file: File) {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setBanner({ type: 'warning', icon: '⚠', message: lang === 'nl' ? `Bestand is te groot (max. ${MAX_FILE_MB} MB). Splits het op in kleinere bestanden.` : `File too large (max ${MAX_FILE_MB} MB). Please split it into smaller files.` });
      return;
    }
    const isText = !/\.(xlsx?|xlsm|xlsb)$/i.test(file.name);
    setIsCsvFile(isText);
    setParsing(true);
    fileNameRef.current = file.name;
    readFileRaw(
      file,
      (wb) => {
        workbookRef.current = wb;
        if (!wb.SheetNames.length) {
          setParsing(false);
          setBanner({ type: 'warning', icon: '⚠', message: lang === 'nl' ? 'Dit bestand bevat geen tabbladen.' : 'This file contains no sheets.' });
          return;
        }
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
        setParsing(false);
      },
      () => {
        setParsing(false);
        setBanner({ type: 'warning', icon: '⚠', message: lang === 'nl' ? 'Bestand kon niet worden gelezen.' : 'Could not read the file.' });
      },
    );
  }

  function handleSheetChange(sheetName: string) {
    if (!workbookRef.current) return;
    applySheet(workbookRef.current, sheetName, true);
  }

  function handleRedetect() {
    if (!rawSheetRef.current || !workbookRef.current) return;
    const rows = sheetTo2D(rawSheetRef.current);
    const idx = Math.max(0, Math.min(headerRowNum - 1, rows.length - 1));
    const parsed = parseFromHeaderRow(rows, idx);
    setPreview({ cols: parsed.cols, data: parsed.data });
    setBanner({
      type: 'info',
      icon: 'ℹ',
      message: lang === 'nl'
        ? `Rij <strong>${idx + 1}</strong> gebruikt. <strong>${parsed.cols.length} kolommen</strong> en <strong>${parsed.data.length} rijen</strong> gevonden.`
        : `Using row <strong>${idx + 1}</strong>. Found <strong>${parsed.cols.length} columns</strong> and <strong>${parsed.data.length} rows</strong>.`,
    });
    onFileLoaded({ data: parsed.data, cols: parsed.cols, rawSheet: rawSheetRef.current, workbook: workbookRef.current, fileName: fileNameRef.current });
  }

  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <label
        className={`upload-zone${uploadedName && !parsing ? ' has-file' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (parsing) return; const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {parsing ? (
          <>
            <span className="upload-icon">⏳</span>
            <div className="upload-label">{lang === 'nl' ? 'Bestand verwerken…' : 'Parsing file…'}</div>
          </>
        ) : (
          <>
            <span className="upload-icon">{icon}</span>
            <div className="upload-label"><strong>{t('fuClickUpload')}</strong> {t('fuOrDrop')}</div>
            <div className="file-formats">.xlsx · .xls · .xlsm · .ods · .csv · .tsv</div>
            {uploadedName && <div className="file-name">{uploadedName}</div>}
          </>
        )}
        <input
          type="file"
          accept=".xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv,.txt"
          disabled={parsing}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </label>

      {!parsing && banner && <Banner {...banner} />}
      {!parsing && isCsvFile && <Banner type="warning" icon="⚠" message={t('fuCsvWarning')} />}

      {!parsing && sheets.length > 1 && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>{t('fuSheetLabel')}:</span>
          <select style={{ flex: 1, fontSize: 12, padding: '5px 8px' }} onChange={(e) => handleSheetChange(e.target.value)}>
            {sheets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {!parsing && uploadedName && (
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

      {!parsing && preview && <PreviewTable cols={preview.cols} data={preview.data} />}
    </div>
  );
}
