import { describe, expect, it } from 'vitest';
import { validateNewMember } from './members';

const TODAY = '2026-10-06';
const good = { name: 'Chidinma Okafor', tier: 'BASIC', expiry: '2026-12-31', phone: '' };

describe('validateNewMember', () => {
  it('accepts a complete entry and tidies the name', () => {
    const result = validateNewMember({ ...good, name: '  Chidinma   Okafor ' }, TODAY);
    expect(result).toMatchObject({ ok: true, expired: false, value: { name: 'Chidinma Okafor', tier: 'BASIC', phone: null } });
    if (result.ok) expect(result.value.expiryDate.toISOString()).toBe('2026-12-31T00:00:00.000Z');
  });

  it('stores an optional phone number as international digits only', () => {
    for (const phone of [' +234 803 123 4567 ', '0803 123 4567', '2348031234567']) {
      expect(validateNewMember({ ...good, phone }, TODAY)).toMatchObject({
        ok: true,
        value: { phone: '2348031234567' },
      });
    }
  });

  it('refuses a missing or oversized name', () => {
    expect(validateNewMember({ ...good, name: '   ' }, TODAY)).toEqual({ ok: false, error: 'name' });
    expect(validateNewMember({ ...good, name: 'a'.repeat(101) }, TODAY)).toEqual({ ok: false, error: 'name' });
  });

  it('refuses any tier other than BASIC or PREMIUM', () => {
    for (const tier of ['', 'basic', 'GOLD', 'PREMIUM ']) {
      expect(validateNewMember({ ...good, tier }, TODAY)).toEqual({ ok: false, error: 'tier' });
    }
    expect(validateNewMember({ ...good, tier: 'PREMIUM' }, TODAY).ok).toBe(true);
  });

  it('refuses a missing or impossible expiry date', () => {
    for (const expiry of ['', '2026-02-30', 'next month', '2026-13-01']) {
      expect(validateNewMember({ ...good, expiry }, TODAY)).toEqual({ ok: false, error: 'expiry' });
    }
  });

  it('allows an expiry before today but marks it expired, so the screen can ask first', () => {
    expect(validateNewMember({ ...good, expiry: '2026-10-05' }, TODAY)).toMatchObject({ ok: true, expired: true });
    expect(validateNewMember({ ...good, expiry: '2020-01-01' }, TODAY)).toMatchObject({ ok: true, expired: true });
  });

  it('does not mark today, or later, as expired', () => {
    expect(validateNewMember({ ...good, expiry: TODAY }, TODAY)).toMatchObject({ ok: true, expired: false });
    expect(validateNewMember({ ...good, expiry: '2027-01-01' }, TODAY)).toMatchObject({ ok: true, expired: false });
  });

  it('refuses a phone number that is not a phone number', () => {
    for (const phone of ['abc', '12', '08031234567890123456789', 'call me', '0803123456']) {
      expect(validateNewMember({ ...good, phone }, TODAY)).toEqual({ ok: false, error: 'phone' });
    }
  });
});
