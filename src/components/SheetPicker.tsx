interface SheetPickerProps {
  sheetNames: string[];
  value: string;
  onChange: (sheet: string) => void;
  title?: string;
}

export default function SheetPicker({ sheetNames, value, onChange, title }: SheetPickerProps) {
  if (sheetNames.length <= 1) return null;
  const tooltip = title ?? 'This file has multiple sheets — select which sheet to read this column from';
  return (
    <div
      title={tooltip}
      style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}
    >
      <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0, userSelect: 'none' }}>📑 Sheet:</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1,
          fontSize: 11,
          padding: '2px 6px',
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--border)',
          borderRadius: 4,
          color: 'var(--text-secondary)',
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}
