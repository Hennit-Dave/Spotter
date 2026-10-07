import type { Metadata } from 'next';
import { Landing } from '@/components/home/Landing';

const title = 'Spotter | Your gym’s answer desk';
const description = 'Your gym’s answer desk.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  robots: { index: true, follow: true },
  openGraph: { type: 'website', siteName: 'Spotter', title, description },
  twitter: { card: 'summary', title, description },
};

export default function HomePage() {
  return <Landing />;
}
