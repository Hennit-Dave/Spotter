import { describe, expect, it } from 'vitest';
import { normalisePhone } from './phone';

describe('normalisePhone', () => {
  it('turns every common way of typing one Nigerian number into the same digits', () => {
    for (const typed of [
      '08074652543',
      '0807 465 2543',
      '0807-465-2543',
      '+234 807 465 2543',
      '+2348074652543',
      '234 807 465 2543',
      '234-807-465-2543',
      '2348074652543',
      '+234 (0) 807 465 2543',
      '+2340807 465 2543',
      '002348074652543',
      '8074652543',
      '  0807.465.2543 ',
    ]) {
      expect(normalisePhone(typed), typed).toBe('2348074652543');
    }
  });

  it('keeps a number from another country, digits only', () => {
    expect(normalisePhone('+44 7700 900123')).toBe('447700900123');
    expect(normalisePhone('0044 7700 900123')).toBe('447700900123');
  });

  it('rejects what it cannot place', () => {
    for (const bad of [
      '',
      'abc',
      'call me',
      '12345',
      '0807465254',
      '080746525431',
      '+234 807 465',
      '2348074652',
      '+0 807 465 2543',
      '+1',
      '08074+652543',
      '7074652543999',
    ]) {
      expect(normalisePhone(bad), bad).toBeNull();
    }
  });

  it('stores digits only: no plus, spaces, dashes or brackets', () => {
    expect(normalisePhone('+234 (807) 465-2543')).toMatch(/^[0-9]+$/);
  });
});
