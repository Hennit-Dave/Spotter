import { createHash, randomBytes } from 'node:crypto';
import type { EmailTokenType } from '../../../generated/prisma/enums';

export const VERIFY_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

export type TokenOwner = { accountId: string } | { staffId: string };

export interface TokenStore {
  emailToken: {
    create(args: {
      data: {
        accountId?: string;
        staffId?: string;
        type: EmailTokenType;
        tokenHash: string;
        expiresAt: Date;
      };
    }): Promise<unknown>;
    updateMany(args: {
      where: {
        accountId?: string;
        staffId?: string;
        tokenHash?: string;
        type: EmailTokenType;
        usedAt: null;
        expiresAt?: { gt: Date };
      };
      data: { usedAt: Date };
    }): Promise<{ count: number }>;
    findFirst(args: {
      where: {
        tokenHash: string;
        type: EmailTokenType;
        usedAt: null;
        expiresAt: { gt: Date };
      };
      select: { accountId: true; staffId: true };
    }): Promise<{ accountId: string | null; staffId: string | null } | null>;
  };
}

export interface TokenOwnerIds {
  accountId: string | null;
  staffId: string | null;
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

// Only the hash is stored. A copy of the table cannot be used to open a link.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Creates a single-use token and returns the raw value, which goes into the email link
// and is never stored. Any earlier unused token of the same type for the same owner is
// ended first, so only the newest link works.
export async function issueToken(
  store: TokenStore,
  owner: TokenOwner,
  type: EmailTokenType,
  lifetimeMs: number,
  now: Date = new Date(),
): Promise<string> {
  await store.emailToken.updateMany({
    where: { ...owner, type, usedAt: null },
    data: { usedAt: now },
  });
  const token = generateToken();
  await store.emailToken.create({
    data: {
      ...owner,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + lifetimeMs),
    },
  });
  return token;
}

// Reads a token without using it, so a page can show whether a link still works.
export async function findUsableToken(
  store: TokenStore,
  token: string,
  type: EmailTokenType,
  now: Date = new Date(),
): Promise<TokenOwnerIds | null> {
  return store.emailToken.findFirst({
    where: { tokenHash: hashToken(token), type, usedAt: null, expiresAt: { gt: now } },
    select: { accountId: true, staffId: true },
  });
}

// Uses a token exactly once. The update only matches a token that is unused and unexpired,
// so two requests with the same link cannot both succeed. Returns the owner, or null.
export async function consumeToken(
  store: TokenStore,
  token: string,
  type: EmailTokenType,
  now: Date = new Date(),
): Promise<TokenOwnerIds | null> {
  const owner = await findUsableToken(store, token, type, now);
  if (!owner) return null;
  const { count } = await store.emailToken.updateMany({
    where: {
      tokenHash: hashToken(token),
      type,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });
  return count === 1 ? owner : null;
}
