'use client';

import { useLang } from '../context/LangContext';

const TUTORIAL_URL = 'https://youtu.be/XxD9TcN_JuU';

export default function TutorialButton() {
  const { t } = useLang();

  return (
    <a
      href={TUTORIAL_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={t('tutorialBtn')}
      aria-label={t('tutorialBtn')}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--navbar-bg)',
        color: 'var(--navbar-text)',
        border: '0.5px solid var(--navbar-border)',
        borderRadius: '50%',
        fontSize: 24,
        fontWeight: 600,
        lineHeight: 1,
        textDecoration: 'none',
        cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.08)';
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.25)';
      }}
    >
      ?
    </a>
  );
}
