import { describe, expect, it } from 'vitest';
import { HOLD_MS, addOneCalendarMonth, nextPaidUntil, paidThrough, planFor } from './plan';

const day = (text: string) => new Date(`${text}T00:00:00Z`);
// 12:00 Lagos on 6 October 2026.
const NOON = new Date('2026-10-06T11:00:00Z');

describe('planFor (gate: tier gating, lapse)', () => {
  it('is FREE for a member who has never paid', () => {
    expect(planFor({ paidUntil: null }, { now: NOON })).toBe('FREE');
  });

  it('is PAID through the whole of the paid-until date, and FREE the day after', () => {
    expect(planFor({ paidUntil: day('2026-10-06') }, { now: NOON })).toBe('PAID');
    expect(planFor({ paidUntil: day('2026-10-07') }, { now: NOON })).toBe('PAID');
    expect(planFor({ paidUntil: day('2026-10-05') }, { now: NOON })).toBe('FREE');
  });

  it('works out the day in Lagos, not UTC, either side of midnight', () => {
    const justBeforeMidnightLagos = new Date('2026-10-06T22:59:59Z');
    const justAfterMidnightLagos = new Date('2026-10-06T23:00:00Z');
    expect(planFor({ paidUntil: day('2026-10-06') }, { now: justBeforeMidnightLagos })).toBe('PAID');
    expect(planFor({ paidUntil: day('2026-10-06') }, { now: justAfterMidnightLagos })).toBe('FREE');
    expect(planFor({ paidUntil: day('2026-10-07') }, { now: justAfterMidnightLagos })).toBe('PAID');
  });

  it('writes nothing: it is a pure function of its inputs', () => {
    const member = { paidUntil: day('2026-10-01') };
    const before = JSON.stringify(member);
    expect(planFor(member, { now: NOON })).toBe('FREE');
    expect(JSON.stringify(member)).toBe(before);
  });
});

describe('the 24-hour hold (gate: hold scope)', () => {
  const lapsed = { paidUntil: day('2026-09-01') };

  it('keeps a lapsed member who has paid before PAID for 24 hours after a pending attempt', () => {
    const attempt = new Date(NOON.getTime() - HOLD_MS + 60_000);
    expect(planFor(lapsed, { now: NOON, pendingAttemptCreatedAt: attempt })).toBe('PAID');
  });

  it('ends the hold after 24 hours', () => {
    const attempt = new Date(NOON.getTime() - HOLD_MS);
    expect(planFor(lapsed, { now: NOON, pendingAttemptCreatedAt: attempt })).toBe('FREE');
  });

  it('gives a member who has never had paid time no hold at all', () => {
    const attempt = new Date(NOON.getTime() - 1000);
    expect(planFor({ paidUntil: null }, { now: NOON, pendingAttemptCreatedAt: attempt })).toBe('FREE');
  });

  it('does nothing without a pending attempt', () => {
    expect(planFor(lapsed, { now: NOON, pendingAttemptCreatedAt: null })).toBe('FREE');
  });
});

describe('paidThrough', () => {
  it('shows the date, or null for a member who has never paid', () => {
    expect(paidThrough({ paidUntil: day('2026-12-31') })).toBe('2026-12-31');
    expect(paidThrough({ paidUntil: null })).toBeNull();
  });
});

describe('addOneCalendarMonth (D34)', () => {
  const cases: Array<[string, string]> = [
    ['2026-10-06', '2026-11-06'],
    ['2026-01-31', '2026-02-28'],
    ['2028-01-31', '2028-02-29'],
    ['2026-03-31', '2026-04-30'],
    ['2026-12-31', '2027-01-31'],
    ['2026-02-28', '2026-03-28'],
    ['2026-05-30', '2026-06-30'],
  ];
  for (const [from, to] of cases) {
    it(`${from} becomes ${to}`, () => {
      expect(addOneCalendarMonth(day(from)).toISOString()).toBe(`${to}T00:00:00.000Z`);
    });
  }
});

describe('nextPaidUntil (gate: paid-time arithmetic)', () => {
  it('counts from today when the member has never paid or has lapsed', () => {
    expect(nextPaidUntil(null, NOON).toISOString()).toBe('2026-11-06T00:00:00.000Z');
    expect(nextPaidUntil(day('2026-08-15'), NOON).toISOString()).toBe('2026-11-06T00:00:00.000Z');
  });

  it('counts from the current paid-until when paying early, so no days are lost', () => {
    expect(nextPaidUntil(day('2026-10-20'), NOON).toISOString()).toBe('2026-11-20T00:00:00.000Z');
  });

  it('counts from today when paid-until is today', () => {
    expect(nextPaidUntil(day('2026-10-06'), NOON).toISOString()).toBe('2026-11-06T00:00:00.000Z');
  });

  it('uses the Lagos date for today, either side of midnight', () => {
    const lagosAlreadyNextDay = new Date('2026-10-06T23:30:00Z');
    expect(nextPaidUntil(null, lagosAlreadyNextDay).toISOString()).toBe('2026-11-07T00:00:00.000Z');
  });

  it('clamps to the end of a shorter month', () => {
    const jan31 = new Date('2026-01-31T09:00:00Z');
    expect(nextPaidUntil(null, jan31).toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('gives a member two months when two payments are applied one after the other', () => {
    const first = nextPaidUntil(null, NOON);
    const second = nextPaidUntil(first, NOON);
    expect(second.toISOString()).toBe('2026-12-06T00:00:00.000Z');
  });
});
