import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

import {
  buildLink,
  isPlausibleEmail,
  normaliseEmail,
  sendAccountEmail,
} from './email';

beforeEach(() => {
  send.mockReset();
  vi.stubEnv('APP_URL', 'https://spotter.example');
  vi.stubEnv('RESEND_API_KEY', 'test-key');
  vi.stubEnv('EMAIL_FROM', 'Spotter <no-reply@spotter.example>');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('normaliseEmail', () => {
  it('trims and lowercases', () => {
    expect(normaliseEmail('  Owner@Example.COM ')).toBe('owner@example.com');
  });
});

describe('isPlausibleEmail', () => {
  it('accepts an address and rejects obvious junk', () => {
    expect(isPlausibleEmail('owner@example.com')).toBe(true);
    expect(isPlausibleEmail('owner')).toBe(false);
    expect(isPlausibleEmail('owner@')).toBe(false);
    expect(isPlausibleEmail('a b@example.com')).toBe(false);
    expect(isPlausibleEmail(`${'a'.repeat(250)}@example.com`)).toBe(false);
  });
});

describe('buildLink', () => {
  it('uses the configured address and carries the token', () => {
    expect(buildLink('/admin/reset-password', 'tok')).toBe(
      'https://spotter.example/admin/reset-password?token=tok',
    );
  });

  it('refuses to build a link without APP_URL', () => {
    vi.stubEnv('APP_URL', '');
    expect(() => buildLink('/admin/reset-password', 'tok')).toThrow('APP_URL');
  });
});

describe('sendAccountEmail', () => {
  it('sends one plain email to one recipient', async () => {
    send.mockResolvedValue({ data: { id: 'x' }, error: null });
    const ok = await sendAccountEmail('reset', 'owner@example.com', 'https://l/x');
    expect(ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe('owner@example.com');
    expect(arg.subject).toBe('Reset your Spotter password');
    expect(arg.text).toContain('https://l/x');
  });

  it('returns false and does not throw when the provider rejects it', async () => {
    send.mockResolvedValue({ data: null, error: { name: 'validation_error' } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await sendAccountEmail('reset', 'owner@example.com', 'https://l/secret-link')).toBe(false);
    expect(JSON.stringify(spy.mock.calls)).not.toContain('secret-link');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('test-key');
    spy.mockRestore();
  });

  it('sends nothing when the key or sender is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await sendAccountEmail('verify', 'a@b.co', 'https://l/x')).toBe(false);
    expect(send).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
