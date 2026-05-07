interface SheetPickerProps {
  sheetNames: string[];
  value: string;
  onChange: (sheet: string) => void;
}

export default function SheetPicker({ sheetNames, value, onChange }: SheetPickerProps) {
  if (sheetNames.length <= 1) return null;
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        display: 'block',
        width: '100%',
        fontSize: 11,
        padding: '2px 6px',
        marginBottom: 3,
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
  );
}
