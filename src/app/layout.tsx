import type { Metadata } from 'next';
import AppShell from '../components/AppShell';
import '../index.css';

export const metadata: Metadata = {
  title: 'De Haan Converter',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning translate="no">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
