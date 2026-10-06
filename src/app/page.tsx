import type { Metadata } from 'next';
import { HomeShell } from '@/components/home/HomeShell';
import { Landing } from '@/components/home/Landing';
import { getSignedInMember } from '@/server/auth/member-session';

export async function generateMetadata(): Promise<Metadata> {
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
export default async function HomePage() {
  const member = await getSignedInMember();
  return member ? <HomeShell /> : <Landing />;
}
