import type { Metadata } from 'next';
import { LegalPage } from '@/components/home/LegalPage';
import { termsOfService } from '@/components/home/legal-content';

export const metadata: Metadata = {
  title: 'Terms of Service',
  robots: { index: false, follow: false },
};

export default function TermsOfServicePage() {
  return <LegalPage document={termsOfService} />;
}
