import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// An ID is permanent and never reused. No code may update a member's membershipId, and members are
// created only by email verification (src/server/auth/verify.ts).
// This is a source check, not a runtime guard. It fails if a member update call and the
// membershipId field appear in the same file.
const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

describe('membership ID permanence', () => {
  it('has no member update or delete call anywhere that touches membershipId', () => {
    const offenders = sourceFiles(SRC)
      .map((path) => ({ path: relative(process.cwd(), path), text: readFileSync(path, 'utf8') }))
      .filter((f) => /member\.(update|updateMany|upsert|delete|deleteMany)\(/.test(f.text) && f.text.includes('membershipId'))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('creates members only in the verification module, the one place that makes them', () => {
    const writers = sourceFiles(SRC)
      .map((path) => ({ path: relative(process.cwd(), path), text: readFileSync(path, 'utf8') }))
      .filter((f) => /member\.create\(/.test(f.text))
      .map((f) => f.path);
    // Members make themselves by signing up (FR-13 is removed), so no staff code creates one.
    expect(writers.every((path) => path === 'src/server/auth/verify.ts')).toBe(true);
  });
});
