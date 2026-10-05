import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Gate: Only two emails. No code path sends an email other than verification and reset.
const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

describe('only two emails', () => {
  const files = sourceFiles(SRC).map((path) => ({
    path: relative(process.cwd(), path),
    text: readFileSync(path, 'utf8'),
  }));

  it('imports the email provider in exactly one file', () => {
    const importers = files.filter((f) => /from ['"]resend['"]/.test(f.text)).map((f) => f.path);
    expect(importers).toEqual(['src/server/auth/email.ts']);
  });

  it('only ever calls the sender with the verify or reset kind', () => {
    const calls = files.flatMap((f) =>
      [...f.text.matchAll(/sendAccountEmail\(\s*([^,)]+)/g)].map((m) => ({ file: f.path, arg: m[1].trim() })),
    );
    const real = calls.filter((c) => c.file !== 'src/server/auth/email.ts');
    expect(real.length).toBeGreaterThan(0);
    for (const call of real) {
      expect(["'verify'", "'reset'"]).toContain(call.arg);
    }
  });

  it('defines exactly the two kinds', () => {
    const email = files.find((f) => f.path === 'src/server/auth/email.ts')!.text;
    expect(email).toContain("export type AccountEmailKind = 'verify' | 'reset';");
  });
});
