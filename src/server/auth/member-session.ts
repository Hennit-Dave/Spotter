import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '../db';
import {
  COOKIE_NAMES,
  SESSION_LIFETIME_SECONDS,
  getSessionSecret,
  isSessionCurrent,
  sessionCookieOptions,
  signSession,
  verifySession,
} from './cookie';

export interface SignedInMember {
  accountId: string;
  // Read from the account's member link on the server. This is the only source of a member ID
  // for a private read (privacy.md). Nothing the client sends is ever used for it.
  memberId: string;
  name: string;
  email: string;
}

export async function startMemberSession(account: {
  id: string;
  sessionVersion: number;
}): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS.member;
  const value = signSession(
    { kind: 'member', id: account.id, v: account.sessionVersion, exp },
    getSessionSecret(),
  );
  (await cookies()).set(COOKIE_NAMES.member, value, sessionCookieOptions('member'));
}

export async function endMemberSession(): Promise<void> {
  (await cookies()).set(COOKIE_NAMES.member, '', {
    ...sessionCookieOptions('member'),
    maxAge: 0,
  });
}

// Reads the member cookie, then loads the account fresh. A cookie with no signature, the
// wrong kind, an old session version, or an account that is not ACTIVE with a member gives
// null: the person is treated as signed out. With no cookie there is no database call.
export const getSignedInMember = cache(async (): Promise<SignedInMember | null> => {
  const value = (await cookies()).get(COOKIE_NAMES.member)?.value;
  if (!value) return null;
  const payload = verifySession(value, getSessionSecret(), 'member', Math.floor(Date.now() / 1000));
  if (!payload) return null;

  const account = await getDb().account.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      memberId: true,
      sessionVersion: true,
    },
  });
  if (!account || account.status !== 'ACTIVE' || account.memberId === null) return null;
  if (
    !isSessionCurrent(payload, {
      active: true,
      sessionVersion: account.sessionVersion,
    })
  ) {
    return null;
  }
  return {
    accountId: account.id,
    memberId: account.memberId,
    name: account.name,
    email: account.email,
  };
});

// Every member screen and action starts here. Without a verified session the person goes to
// log in.
export async function requireMember(): Promise<SignedInMember> {
  const member = await getSignedInMember();
  if (!member) redirect('/log-in');
  return member;
}
