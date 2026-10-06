'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/server/db';
import {
  createMember,
  findDuplicateMembers,
  findMemberSummaryById,
  validateNewMember,
} from '@/server/admin/members';
import { requireAdmin } from '@/server/auth/admin-session';
import { calendarDateText, lagosDate } from '@/server/time';
import type { AddMemberState, MemberFormValues } from './form-state';
import { EMPTY_VALUES } from './form-state';

const ERRORS: Record<string, string> = {
  name: "Enter the member's name, up to 100 characters.",
  tier: 'Choose Basic or Premium.',
  expiry: 'Enter the expiry date as a real date.',
  phone: 'That does not look like a phone number. Use a local number like 0807 465 2543, or one with the country code like +234 807 465 2543. Or leave it blank.',
  busy: 'Could not save the member. Nothing was added. Try again.',
};

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function formState(values: MemberFormValues, error: string | null, done: string | null = null): AddMemberState {
  return { step: 'form', nonce: Date.now(), values, error, done };
}

// Staff and owner may both create a member (FR-13). The role check comes first, before any
// read or write. The system makes the membership ID. Nobody types it.
//
// One submit can take several steps, because each warning needs an answer from the person:
// the form, then "this membership has already expired", then "this member may already
// exist". Each answer comes back as a button in the same form. Nothing is saved until the
// last step. Nothing here ever blocks: every warning can be answered "save anyway".
export async function addMember(_previous: AddMemberState, formData: FormData): Promise<AddMemberState> {
  const staff = await requireAdmin();

  const values: MemberFormValues = {
    name: text(formData, 'name'),
    tier: text(formData, 'tier') || EMPTY_VALUES.tier,
    expiry: text(formData, 'expiry'),
    phone: text(formData, 'phone'),
  };

  // "Go back" keeps what was typed.
  if (text(formData, 'back') === '1') return formState(values, null);

  // "Use this member" saves nothing and shows that member's ID.
  const useMemberId = text(formData, 'useMember');
  if (useMemberId !== '') {
    const member = await findMemberSummaryById(getDb(), useMemberId);
    if (!member) return formState(values, ERRORS.busy);
    return formState(
      EMPTY_VALUES,
      null,
      `Using ${member.name}. Membership ID ${member.membershipId}. Nothing was saved.`,
    );
  }

  const result = validateNewMember(values, lagosDate());
  if (!result.ok) return formState(values, ERRORS[result.error]);

  const confirmedExpired = text(formData, 'confirmExpired') === '1';
  if (result.expired && !confirmedExpired) {
    return { step: 'confirmExpired', nonce: Date.now(), values };
  }

  if (text(formData, 'confirmNew') !== '1') {
    const matches = await findDuplicateMembers(getDb(), {
      name: result.value.name,
      phone: result.value.phone,
    });
    if (matches.length > 0) {
      return {
        step: 'duplicates',
        nonce: Date.now(),
        values,
        confirmedExpired,
        matches: matches.map((m) => ({
          id: m.id,
          membershipId: m.membershipId,
          name: m.name,
          phone: m.phone,
          tier: m.tier,
          expiry: calendarDateText(m.expiryDate),
          nameMatch: m.nameMatch,
          phoneMatch: m.phoneMatch,
          accountEmail: m.account?.email ?? null,
        })),
      };
    }
  }

  let membershipId: string | null = null;
  try {
    membershipId = (await createMember(getDb(), result.value, staff.id)).membershipId;
  } catch {
    console.error('Member creation failed');
  }
  if (!membershipId) return formState(values, ERRORS.busy);

  revalidatePath('/admin/members');
  return formState(
    EMPTY_VALUES,
    null,
    `Added ${result.value.name}. Membership ID ${membershipId}. Give this ID to the member. They need it to sign up.`,
  );
}
