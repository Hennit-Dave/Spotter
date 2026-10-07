import { describe, expect, it } from 'vitest';
import { cleanName, parseAnswer, validateSignUp } from './signup';

const good = {
  name: '  Ada   Obi ',
  email: ' Ada@Example.COM ',
  phone: '0807 465 2543',
  answer: 'no',
  acceptedTerms: true,
};

describe('sign-up form', () => {
  it('stores the email in lowercase, the phone as international digits and the name tidied', () => {
    expect(validateSignUp(good)).toEqual({
      ok: true,
      value: {
        name: 'Ada Obi',
        email: 'ada@example.com',
        phone: '2348074652543',
        claimsExistingMember: false,
      },
    });
  });

  it('reads Yes as an existing member and No as a new one', () => {
    expect(parseAnswer('yes')).toBe(true);
    expect(parseAnswer('no')).toBe(false);
  });

  it('refuses to guess an answer', () => {
    expect(parseAnswer('')).toBeNull();
    expect(parseAnswer('maybe')).toBeNull();
    expect(validateSignUp({ ...good, answer: '' })).toEqual({ ok: false, problem: 'answer' });
  });

  it('names the field to fix and nothing else', () => {
    expect(validateSignUp({ ...good, name: '   ' })).toEqual({ ok: false, problem: 'name' });
    expect(validateSignUp({ ...good, email: 'nope' })).toEqual({ ok: false, problem: 'email' });
    expect(validateSignUp({ ...good, phone: '12' })).toEqual({ ok: false, problem: 'phone' });
  });

  it('refuses a name that is too long', () => {
    expect(cleanName(`${'a'.repeat(99)} b`)).toBeNull();
    expect(cleanName(`${'a'.repeat(98)} b`)).not.toBeNull();
  });

  it('needs at least two names separated by a space', () => {
    expect(cleanName('Ada')).toBeNull();
    expect(cleanName('  Ada  ')).toBeNull();
    expect(cleanName('')).toBeNull();
    expect(cleanName('Ada Obi')).toBe('Ada Obi');
    expect(cleanName('Ada  Obi   Eze')).toBe('Ada Obi Eze');
    expect(validateSignUp({ ...good, name: 'Ada' })).toEqual({ ok: false, problem: 'name' });
  });

  it('refuses a sign-up that has not accepted the terms', () => {
    expect(validateSignUp({ ...good, acceptedTerms: false })).toEqual({
      ok: false,
      problem: 'terms',
    });
  });

  it('has no password field', () => {
    expect(Object.keys(good)).not.toContain('password');
  });
});
