import { describe, expect, it } from 'vitest';
import {
  COOKIE_NAMES,
  COOKIE_PATHS,
  isSessionCurrent,
  sessionCookieOptions,
  signSession,
  verifySession,
  type SessionPayload,
} from './cookie';

const SECRET = 'a-test-secret-that-is-at-least-32-characters-long';
const NOW = 1_000_000;

const admin: SessionPayload = { kind: 'admin', id: 'staff1', v: 3, exp: NOW + 100 };

describe('signSession and verifySession', () => {
  it('round trips a valid cookie', () => {
    const value = signSession(admin, SECRET);
    expect(verifySession(value, SECRET, 'admin', NOW)).toEqual(admin);
  });

  it('rejects a cookie signed with another secret', () => {
    const value = signSession(admin, 'another-secret-that-is-also-32-characters-long');
    expect(verifySession(value, SECRET, 'admin', NOW)).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const value = signSession(admin, SECRET);
    const forged = Buffer.from(
      JSON.stringify({ ...admin, id: 'someone-else' }),
    ).toString('base64url');
    const tampered = `${forged}.${value.split('.')[1]}`;
    expect(verifySession(tampered, SECRET, 'admin', NOW)).toBeNull();
  });

  it('does not let a member cookie pass as an admin cookie, or the reverse', () => {
    const member = signSession({ ...admin, kind: 'member' }, SECRET);
    expect(verifySession(member, SECRET, 'admin', NOW)).toBeNull();
    expect(verifySession(signSession(admin, SECRET), SECRET, 'member', NOW)).toBeNull();
  });

  it('rejects an expired cookie', () => {
    const value = signSession(admin, SECRET);
    expect(verifySession(value, SECRET, 'admin', admin.exp)).toBeNull();
  });

  it('rejects missing and malformed values', () => {
    expect(verifySession(undefined, SECRET, 'admin', NOW)).toBeNull();
    expect(verifySession('', SECRET, 'admin', NOW)).toBeNull();
    expect(verifySession('abc', SECRET, 'admin', NOW)).toBeNull();
    expect(verifySession('a.b.c', SECRET, 'admin', NOW)).toBeNull();
  });
});

describe('cookie settings', () => {
  it('keeps the admin cookie on /admin under its own name, strict and httpOnly', () => {
    const options = sessionCookieOptions('admin');
    expect(options.path).toBe('/admin');
    expect(COOKIE_PATHS.admin).toBe('/admin');
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('strict');
    expect(COOKIE_NAMES.admin).not.toBe(COOKIE_NAMES.member);
  });
});

describe('isSessionCurrent', () => {
  it('needs an active row and a matching session version', () => {
    expect(isSessionCurrent({ v: 2 }, { active: true, sessionVersion: 2 })).toBe(true);
    expect(isSessionCurrent({ v: 2 }, { active: false, sessionVersion: 2 })).toBe(false);
    expect(isSessionCurrent({ v: 2 }, { active: true, sessionVersion: 3 })).toBe(false);
  });
});
