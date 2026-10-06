import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import '../styles/globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-dm-sans',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Spotter', template: '%s | Spotter' },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}
