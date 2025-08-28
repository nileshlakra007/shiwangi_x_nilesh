import type { Metadata } from 'next';
import './globals.css';
import { siteConfig } from './site-config';

export const metadata: Metadata = {
  title: siteConfig.appName,
  description: 'A Netflix-style birthday page for Shiwangi x Nilesh',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

