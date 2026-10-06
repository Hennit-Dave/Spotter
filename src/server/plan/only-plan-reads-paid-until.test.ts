import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Gate: one plan function. Only the code in src/server/plan/ may mention Member.paidUntil, so the
// card filter, the status strip and the check-in gate cannot each use a slightly different rule.
// Other code selects the field through PLAN_FIELDS and works out the plan with planFor.
const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

describe('only the plan module reads paidUntil', () => {
  it('names the column nowhere else in the source', () => {
    const offenders = sourceFiles(SRC)
      .map((path) => ({ path: relative(process.cwd(), path), text: readFileSync(path, 'utf8') }))
      .filter((f) => !f.path.startsWith('src/server/plan/'))
      .filter((f) => f.text.includes('paidUntil'))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});
