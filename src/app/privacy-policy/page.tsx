import type { Metadata } from 'next';
import { LegalPage } from '@/components/home/LegalPage';
import { privacyPolicy } from '@/components/home/legal-content';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  robots: { index: false, follow: false },
};

export default function PrivacyPolicyPage() {
  return <LegalPage document={privacyPolicy} />;
}
