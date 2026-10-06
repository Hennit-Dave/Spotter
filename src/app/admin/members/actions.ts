'use server';

import { redirect } from 'next/navigation';
import { getDb } from '@/server/db';
import { createMember, validateNewMember } from '@/server/admin/members';
import { requireAdmin } from '@/server/auth/admin-session';
import { lagosDate } from '@/server/time';

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

// Staff and owner may both create a member (FR-13). The role check comes first, before any
// read or write. The system makes the membership ID. Nobody types it.
export async function addMember(formData: FormData): Promise<void> {
  const staff = await requireAdmin();

  const result = validateNewMember(
    {
      name: text(formData, 'name'),
      tier: text(formData, 'tier'),
      expiry: text(formData, 'expiry'),
      phone: text(formData, 'phone'),
    },
    lagosDate(),
  );
  if (!result.ok) redirect(`/admin/members?e=${result.error}`);

  let membershipId: string | null = null;
  try {
    membershipId = (await createMember(getDb(), result.value, staff.id)).membershipId;
  } catch {
    console.error('Member creation failed');
  }
  if (!membershipId) redirect('/admin/members?e=busy');

  redirect(`/admin/members?created=${encodeURIComponent(membershipId)}`);
}
