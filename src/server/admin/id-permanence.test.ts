import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// FR-13: an ID cannot be edited or reused. No code may update a member's membershipId.
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

  it('writes membershipId in exactly one place: member creation', () => {
    const writers = sourceFiles(SRC)
      .map((path) => ({ path: relative(process.cwd(), path), text: readFileSync(path, 'utf8') }))
      .filter((f) => /member\.create\(/.test(f.text))
      .map((f) => f.path);
    expect(writers).toEqual(['src/server/admin/members.ts']);
  });
});
