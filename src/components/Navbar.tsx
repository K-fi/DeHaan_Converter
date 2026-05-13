'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '../context/LangContext';

export default function Navbar() {
  const { lang, setLang, t } = useLang();
  const pathname = usePathname();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('dehaan-theme');
    const initial: 'light' | 'dark' =
      saved === 'dark' ? 'dark' :
      saved === 'light' ? 'light' :
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggleTheme() {
    const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('dehaan-theme', next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <nav className="navbar">
      <img src="/DeHaan_ICON.png" alt="De Haan" className="navbar-logo" />

      <div className="navbar-links">
        <Link href="/" className={`navbar-link${pathname === '/' || pathname === '/price-updater' ? ' active' : ''}`}>
          {t('navPrice')}
        </Link>
        <Link href="/converter" className={`navbar-link${pathname === '/converter' ? ' active' : ''}`}>
          {t('navConverter')}
        </Link>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? (lang === 'nl' ? 'Lichte modus' : 'Light mode') : (lang === 'nl' ? 'Donkere modus' : 'Dark mode')}
          style={{
            padding: '4px 9px',
            background: 'transparent',
            border: '0.5px solid var(--navbar-border)',
            borderRadius: 6,
            color: 'var(--navbar-text)',
            cursor: 'pointer',
            fontSize: 15,
            lineHeight: 1,
            opacity: 0.85,
            transition: 'opacity 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>

        {/* Language switcher */}
        <div style={{ display: 'flex', border: '0.5px solid var(--navbar-border)', borderRadius: 6, overflow: 'hidden', fontSize: 12 }}>
          <button
            onClick={() => setLang('nl')}
            style={{
              padding: '4px 12px',
              background: lang === 'nl' ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: 'var(--navbar-text)',
              opacity: lang === 'nl' ? 1 : 0.7,
              fontWeight: lang === 'nl' ? 600 : 400,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.1s',
            }}
          >
            NL
          </button>
          <button
            onClick={() => setLang('en')}
            style={{
              padding: '4px 12px',
              background: lang === 'en' ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: 'var(--navbar-text)',
              opacity: lang === 'en' ? 1 : 0.7,
              fontWeight: lang === 'en' ? 600 : 400,
              border: 'none',
              borderLeft: '0.5px solid var(--navbar-border)',
              cursor: 'pointer',
              transition: 'all 0.1s',
            }}
          >
            EN
          </button>
        </div>
      </div>
    </nav>
  );
}
