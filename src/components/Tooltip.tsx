interface TooltipProps { text: string; }

export default function Tooltip({ text }: TooltipProps) {
  return (
    <span className="tt">
      <span className="tt-icon">ⓘ</span>
      <span className="tt-box">{text}</span>
    </span>
  );
}
