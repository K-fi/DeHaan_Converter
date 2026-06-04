'use client';

import { LangProvider } from '../context/LangContext';
import Navbar from './Navbar';
import TutorialButton from './TutorialButton';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <Navbar />
      <main className="page-content">{children}</main>
      <TutorialButton />
    </LangProvider>
  );
}
