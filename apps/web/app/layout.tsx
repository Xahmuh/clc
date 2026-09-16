import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { LanguageProvider } from '@/lib/language-context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CLC CRM — Contracting & Field Activity Tracking',
  description: 'CRM system for CLC Contracting Company, Riyadh, Saudi Arabia',
  other: {
    google: 'notranslate',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} notranslate`} translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="font-sans antialiased bg-white text-ink-900 selection:bg-ink-900 selection:text-white notranslate">
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
