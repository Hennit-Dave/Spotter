import type { AttemptKind } from '../../../generated/prisma/enums';

export const ATTEMPT_LIMIT = 5;
export const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

export interface AttemptStore {
  failedAttempt: {
    count(args: {
      where: { kind: AttemptKind; key: string; createdAt: { gt: Date } };
    }): Promise<number>;
    create(args: { data: { kind: AttemptKind; key: string } }): Promise<unknown>;
  };
}

// True when this kind and key have already failed the limit number of times in the window.
// The count lives in the database, because server memory is lost between requests.
export async function isPaused(
  store: AttemptStore,
  kind: AttemptKind,
  key: string,
  now: Date = new Date(),
): Promise<boolean> {
  const since = new Date(now.getTime() - ATTEMPT_WINDOW_MS);
  const failures = await store.failedAttempt.count({
    where: { kind, key, createdAt: { gt: since } },
  });
  return failures >= ATTEMPT_LIMIT;
}

export async function recordFailure(
  store: AttemptStore,
  kind: AttemptKind,
  key: string,
): Promise<void> {
  await store.failedAttempt.create({ data: { kind, key } });
}
