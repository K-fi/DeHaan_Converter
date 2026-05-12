'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '../context/LangContext';

export default function Navbar() {
  const { lang, setLang, t } = useLang();
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <div className="navbar-brand">De Haan Converter</div>
      <div className="navbar-links">
        <Link href="/" className={`navbar-link${pathname === '/' || pathname === '/price-updater' ? ' active' : ''}`}>
          {t('navPrice')}
        </Link>
        <Link href="/converter" className={`navbar-link${pathname === '/converter' ? ' active' : ''}`}>
          {t('navConverter')}
        </Link>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', border: '0.5px solid var(--border-md)', borderRadius: 6, overflow: 'hidden', fontSize: 12 }}>
        <button
          onClick={() => setLang('nl')}
          style={{ padding: '4px 12px', background: lang === 'nl' ? 'var(--green-bg)' : 'var(--bg)', color: lang === 'nl' ? 'var(--green-text)' : 'var(--text-secondary)', fontWeight: lang === 'nl' ? 600 : 400, border: 'none', cursor: 'pointer', transition: 'all 0.1s' }}
        >
          NL
        </button>
        <button
          onClick={() => setLang('en')}
          style={{ padding: '4px 12px', background: lang === 'en' ? 'var(--green-bg)' : 'var(--bg)', color: lang === 'en' ? 'var(--green-text)' : 'var(--text-secondary)', fontWeight: lang === 'en' ? 600 : 400, border: 'none', borderLeft: '0.5px solid var(--border-md)', cursor: 'pointer', transition: 'all 0.1s' }}
        >
          EN
        </button>
      </div>
    </nav>
  );
}
