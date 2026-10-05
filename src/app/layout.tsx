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
  title: 'Spotter',
  description: "Ask your gym. Answers come from the gym's own records.",
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
