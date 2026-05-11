'use client';

import { LangProvider } from '../context/LangContext';
import Navbar from './Navbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <Navbar />
      <main className="page-content">{children}</main>
    </LangProvider>
  );
}
