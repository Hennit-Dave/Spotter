import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Source checks. Each fails if code outside the named files touches a field that only they may
// write. When a new writer is approved, its file is added here deliberately.
const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({
  path: relative(process.cwd(), path),
  text: readFileSync(path, 'utf8'),
}));

function filesMatching(pattern: RegExp): string[] {
  return files
    .filter((f) => pattern.test(f.text))
    .map((f) => f.path)
    .sort();
}

describe('a password is set only by a link (gate)', () => {
  it('lets only the verification, member reset and desk reset code write a password hash', () => {
    // A write is passwordHash given a value inside data: { ... }, as opposed to being selected
    // or read. Sign-in code only selects it.
    const writers = files
      .filter(
        (f) =>
          /data:\s*\{[^}]*passwordHash/.test(f.text) ||
          /passwordHash,\s*\n\s*(status|sessionVersion|\}|emailVerifiedAt)/.test(f.text),
      )
      .map((f) => f.path)
      .sort();
    expect(writers).toEqual([
      'src/app/admin/reset-password/actions.ts',
      'src/server/auth/member-reset.ts',
      'src/server/auth/verify.ts',
    ]);
  });

  it('never writes a hash from sign-up, sign-in or the session code', () => {
    for (const path of [
      'src/server/auth/signup.ts',
      'src/server/auth/member-login.ts',
      'src/server/auth/member-session.ts',
    ]) {
      const text = files.find((f) => f.path === path)!.text;
      expect(text.includes('hashPassword'), path).toBe(false);
    }
  });
});

describe('the opening-balance flag has one writer here (gate: Balance start)', () => {
  it('is written only by the verification transaction until the owner entry exists', () => {
    const writers = filesMatching(/openingBalanceSet\s*:\s*(?!true,\s*$)(?!row\.)/m).filter(
      (path) => {
        const text = files.find((f) => f.path === path)!.text;
        return /(create|update|updateMany|upsert)\s*\(/.test(text);
      },
    );
    expect(writers).toEqual(['src/server/auth/verify.ts']);
  });
});

describe('only a verified, linked account is a member', () => {
  it('reads the member link from the account on the server and requires ACTIVE', () => {
    const text = files.find((f) => f.path === 'src/server/auth/member-session.ts')!.text;
    expect(text).toContain("account.status !== 'ACTIVE' || account.memberId === null");
  });

  it('creates a member in one place only', () => {
    expect(filesMatching(/\.member\.create\(/)).toEqual(['src/server/auth/verify.ts']);
  });
});
