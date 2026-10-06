import { describe, expect, it } from 'vitest';
import { calendarDateText, lagosDate, parseCalendarDate } from './time';

describe('lagosDate', () => {
  it('converts to Lagos before taking the date, so a late evening is the next Lagos day', () => {
    // 23:30 UTC is 00:30 the next day in Lagos (UTC+1).
    expect(lagosDate(new Date('2026-10-05T23:30:00Z'))).toBe('2026-10-06');
    expect(lagosDate(new Date('2026-10-05T22:59:59Z'))).toBe('2026-10-05');
    expect(lagosDate(new Date('2026-10-05T23:00:00Z'))).toBe('2026-10-06');
  });

  it('does not depend on the server time zone', () => {
    expect(lagosDate(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01');
  });
});

describe('parseCalendarDate', () => {
  it('stores a date as midnight UTC and reads the same date back', () => {
    const date = parseCalendarDate('2026-12-31');
    expect(date?.toISOString()).toBe('2026-12-31T00:00:00.000Z');
    expect(calendarDateText(date!)).toBe('2026-12-31');
  });

  it('accepts a leap day only in a leap year', () => {
    expect(parseCalendarDate('2028-02-29')).not.toBeNull();
    expect(parseCalendarDate('2027-02-29')).toBeNull();
  });

  it('rejects text that is not a real date', () => {
    for (const bad of ['', 'tomorrow', '2026-13-01', '2026-00-10', '2026-04-31', '31-12-2026', '2026-1-5', '2026-12-31T00:00:00Z']) {
      expect(parseCalendarDate(bad)).toBeNull();
    }
  });
});
