import { describe, expect, it } from 'vitest';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  hashPassword,
  isAcceptablePassword,
  verifyPassword,
} from './password';

describe('isAcceptablePassword', () => {
  it('needs at least the minimum length and no character-type rules', () => {
    expect(isAcceptablePassword('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe(false);
    expect(isAcceptablePassword('a'.repeat(MIN_PASSWORD_LENGTH))).toBe(true);
    expect(isAcceptablePassword('        ')).toBe(true);
  });

  it('rejects an enormous password', () => {
    expect(isAcceptablePassword('a'.repeat(MAX_PASSWORD_LENGTH + 1))).toBe(false);
  });
});

describe('hashPassword and verifyPassword', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(stored.startsWith('$argon2id$')).toBe(true);
    expect(stored).not.toContain('correct horse battery');
    expect(await verifyPassword(stored, 'correct horse battery')).toBe(true);
    expect(await verifyPassword(stored, 'wrong password!')).toBe(false);
  });

  it('returns false when there is no stored hash', async () => {
    expect(await verifyPassword(null, 'anything at all')).toBe(false);
  });

  it('returns false for a malformed stored hash instead of throwing', async () => {
    expect(await verifyPassword('not-a-hash', 'anything at all')).toBe(false);
  });
});
