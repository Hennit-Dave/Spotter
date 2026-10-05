import { createHmac, timingSafeEqual } from 'node:crypto';

export type SessionKind = 'member' | 'admin';

export interface SessionPayload {
  kind: SessionKind;
  id: string;
  // The session version stored on the account or staff row when the cookie was issued.
  v: number;
  // Expiry as seconds since the epoch.
  exp: number;
}

export const COOKIE_NAMES = {
  member: 'spotter_member',
  admin: 'spotter_admin',
} as const;

// The admin cookie is only sent to /admin, so admin code never sees a member cookie
// and member routes never receive the admin one.
export const COOKIE_PATHS = { member: '/', admin: '/admin' } as const;

export const SESSION_LIFETIME_SECONDS = {
  member: 60 * 60 * 24 * 30,
  admin: 60 * 60 * 12,
} as const;

const MIN_SECRET_LENGTH = 32;

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error('SESSION_SECRET is missing or shorter than 32 characters');
  }
  return secret;
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function signSession(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

// Returns the payload only when the signature is valid, the kind is the one expected,
// and the cookie has not expired. Anything else returns null.
export function verifySession(
  value: string | undefined,
  secret: string,
  expectedKind: SessionKind,
  nowSeconds: number,
): SessionPayload | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Partial<SessionPayload>;
  if (
    p.kind !== expectedKind ||
    typeof p.id !== 'string' ||
    typeof p.v !== 'number' ||
    typeof p.exp !== 'number' ||
    p.exp <= nowSeconds
  ) {
    return null;
  }
  return { kind: p.kind, id: p.id, v: p.v, exp: p.exp };
}

export function sessionCookieOptions(kind: SessionKind) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: kind === 'admin' ? ('strict' as const) : ('lax' as const),
    path: COOKIE_PATHS[kind],
    maxAge: SESSION_LIFETIME_SECONDS[kind],
  };
}
