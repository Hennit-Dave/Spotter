import { HomeShell } from '@/components/home/HomeShell';
import { Landing } from '@/components/home/Landing';
import { getSignedInMember } from '@/server/auth/member-session';

// A signed-out visitor makes no database call: with no cookie there is nothing to look up.
export default async function HomePage() {
  const member = await getSignedInMember();
  return member ? <HomeShell /> : <Landing />;
}
