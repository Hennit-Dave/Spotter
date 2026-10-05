'use server';

import { redirect } from 'next/navigation';
import { endAdminSession } from '@/server/auth/admin-session';

export async function signOut(): Promise<void> {
  await endAdminSession();
  redirect('/admin/log-in');
}
