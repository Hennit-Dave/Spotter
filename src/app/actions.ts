'use server';

import { redirect } from 'next/navigation';
import { endMemberSession } from '@/server/auth/member-session';

export async function logOut(): Promise<void> {
  await endMemberSession();
  redirect('/');
}
