import type { BannerInfo } from '../types';

export default function Banner({ type, icon, message }: BannerInfo) {
  return (
    <div className={`detect-banner ${type}`}>
      <span className="detect-banner-icon">{icon}</span>
      <span dangerouslySetInnerHTML={{ __html: message }} />
    </div>
  );
}
