import type { AttemptKind } from '../../../generated/prisma/enums';

export const ATTEMPT_LIMIT = 5;
export const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

export interface AttemptRule {
  limit: number;
  windowMs: number;
}

const WRONG_TRY_RULE: AttemptRule = { limit: ATTEMPT_LIMIT, windowMs: ATTEMPT_WINDOW_MS };

// The limits are written in auth.md. Wrong tries pause after five in ten minutes. A reset
// email goes out at most three times per email address per hour.
export const ATTEMPT_RULES: Record<AttemptKind, AttemptRule> = {
  MEMBER_LOGIN: WRONG_TRY_RULE,
  ADMIN_LOGIN: WRONG_TRY_RULE,
  CHECK_IN_CODE: WRONG_TRY_RULE,
  PASSWORD_RESET_EMAIL: { limit: 3, windowMs: 60 * 60 * 1000 },
};

export interface AttemptStore {
  failedAttempt: {
    count(args: {
      where: { kind: AttemptKind; key: string; createdAt: { gt: Date } };
    }): Promise<number>;
    create(args: { data: { kind: AttemptKind; key: string } }): Promise<unknown>;
  };
}

// True when this kind and key have already used up the limit for that kind inside its window.
// The count lives in the database, because server memory is lost between requests.
export async function isPaused(
  store: AttemptStore,
  kind: AttemptKind,
  key: string,
  now: Date = new Date(),
): Promise<boolean> {
  const { limit, windowMs } = ATTEMPT_RULES[kind];
  const since = new Date(now.getTime() - windowMs);
  const used = await store.failedAttempt.count({
    where: { kind, key, createdAt: { gt: since } },
  });
  return used >= limit;
}

export async function recordFailure(
  store: AttemptStore,
  kind: AttemptKind,
  key: string,
): Promise<void> {
  await store.failedAttempt.create({ data: { kind, key } });
}

// For limits on requests rather than wrong tries. Returns false, writing nothing, when the
// limit is already used up. Otherwise records this request and returns true. Requests that
// are refused are not recorded, so a person who keeps trying does not extend their own pause.
// The same call is made whether or not the email has an account, so the limit reveals nothing.
export async function takeAttempt(
  store: AttemptStore,
  kind: AttemptKind,
  key: string,
  now: Date = new Date(),
): Promise<boolean> {
  if (await isPaused(store, kind, key, now)) return false;
  await recordFailure(store, kind, key);
  return true;
}
