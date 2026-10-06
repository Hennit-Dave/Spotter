import type { Metadata } from 'next';
import { HomeShell } from '@/components/home/HomeShell';
import { Landing } from '@/components/home/Landing';
import { LegalView } from '@/components/home/LegalView';
import { privacyPolicy, termsOfService } from '@/components/home/legal-content';
import { getSignedInMember } from '@/server/auth/member-session';

type HomeProps = { searchParams: Promise<{ view?: string | string[] }> };

function legalDocument(view: string | string[] | undefined) {
  if (view === 'privacy') return privacyPolicy;
  if (view === 'terms') return termsOfService;
  return null;
}

export async function generateMetadata({ searchParams }: HomeProps): Promise<Metadata> {
  const document = legalDocument((await searchParams).view);
  if (document) {
    return {
      title: { absolute: `${document.title} | Spotter` },
      robots: { index: false, follow: false },
    };
  }
  const member = await getSignedInMember();
  if (member) {
    return {
      title: { absolute: 'Home | Spotter' },
      robots: { index: false, follow: false },
    };
  }

  const title = 'Spotter | Your gym’s answer desk';
  const description = 'Your gym’s answer desk.';
  return {
    title: { absolute: title },
    description,
    robots: { index: true, follow: true },
    openGraph: { type: 'website', siteName: 'Spotter', title, description },
    twitter: { card: 'summary', title, description },
  };
}

// A signed-out visitor makes no database call: with no cookie there is nothing to look up.
export default async function HomePage({ searchParams }: HomeProps) {
  const document = legalDocument((await searchParams).view);
  if (document) return <LegalView document={document} />;
  const member = await getSignedInMember();
  return member ? <HomeShell /> : <Landing />;
}
