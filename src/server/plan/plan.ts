import { calendarDateText, lagosDate } from '../time';

// The one place a member's plan is worked out and paid time is calculated (data-model.md). No
// other code reads Member.paidUntil. A source check enforces that. Nothing here writes to the
// database, so nothing is written when paid time runs out.

export type Plan = 'FREE' | 'PAID';

// What a query must select to work out a member's plan. Queries spread this instead of naming the
// column, so only this folder mentions it.
export const PLAN_FIELDS = { paidUntil: true } as const;

export interface PlanFields {
  paidUntil: Date | null;
}

export const HOLD_MS = 24 * 60 * 60 * 1000;

// FREE or PAID at this moment. A member is PAID through the whole of the paid-until date in
// Africa/Lagos. A pending payment gives a 24-hour hold, but only to a member who has had paid time
// before (paid-until not empty): starting a payment must not be a way to get paid cards for free.
// The hold is worked out here and never written.
export function planFor(
  member: PlanFields,
  options: { now?: Date; pendingAttemptCreatedAt?: Date | null } = {},
): Plan {
  const now = options.now ?? new Date();
  if (member.paidUntil === null) return 'FREE';
  if (calendarDateText(member.paidUntil) >= lagosDate(now)) return 'PAID';
  const pending = options.pendingAttemptCreatedAt;
  if (pending && now.getTime() - pending.getTime() < HOLD_MS) return 'PAID';
  return 'FREE';
}

// The date a member is paid through, as YYYY-MM-DD, or null if they have never paid.
export function paidThrough(member: PlanFields): string | null {
  return member.paidUntil === null ? null : calendarDateText(member.paidUntil);
}

// One calendar month later, clamped to the end of the month: 31 January becomes 28 or 29
// February. Takes and returns a calendar date stored as midnight UTC.
export function addOneCalendarMonth(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const lastDayOfNextMonth = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + 1, Math.min(day, lastDayOfNextMonth)));
}

// The new paid-until after one paid month: one calendar month after the later of today
// (Africa/Lagos) and the current paid-until. Paying early never loses days.
export function nextPaidUntil(current: Date | null, now: Date = new Date()): Date {
  const today = new Date(`${lagosDate(now)}T00:00:00Z`);
  const base = current !== null && current.getTime() > today.getTime() ? current : today;
  return addOneCalendarMonth(base);
}
