import Tooltip from './Tooltip';
import { useLang } from '../context/LangContext';

interface ColumnPreviewProps {
  col: string;
  data: Record<string, unknown>[];
}

export default function ColumnPreview({ col, data }: ColumnPreviewProps) {
  const { t } = useLang();

  if (!col) return null;

  const samples: string[] = [];
  for (let i = 0; i < data.length && samples.length < 3; i++) {
    const v = String(data[i][col] ?? '').trim();
    if (v) samples.push(v);
  }

  if (!samples.length) return null;

  return (
    <div className="col-preview">
      <span className="col-preview-label">
        {t('colPreviewLabel')}
        <Tooltip text={t('colPreviewTooltip')} />
      </span>
      <div className="col-preview-vals">
        {samples.map((s, i) => (
          <span key={i} className="col-preview-val" title={s}>{s}</span>
        ))}
      </div>
    </div>
  );
}
