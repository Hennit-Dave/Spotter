import { hash, verify } from '@node-rs/argon2';

export const MIN_PASSWORD_LENGTH = 8;
// A ceiling so an enormous string cannot be used to make the server hash for a long time.
export const MAX_PASSWORD_LENGTH = 1000;

const HASH_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function isAcceptablePassword(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, HASH_OPTIONS);
}

let dummyHash: Promise<string> | undefined;

// Verifies a password. When there is no stored hash (no such account, or a staff member who
// has not set a password yet) it still does the same amount of work against a throwaway
// hash and returns false, so the response time does not reveal whether the account exists.
export async function verifyPassword(
  storedHash: string | null,
  password: string,
): Promise<boolean> {
  if (storedHash === null) {
    dummyHash ??= hashPassword('spotter-dummy-password');
    await verify(await dummyHash, password).catch(() => false);
    return false;
  }
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}
