import { describe, expect, it } from 'vitest';
import { assertSafeTestUrl, endpointOf } from './test-db';

const MAIN_POOLED = 'postgresql://u:p@ep-main-123-pooler.c-4.ap-southeast-1.aws.neon.tech/db?sslmode=require';
const MAIN_DIRECT = 'postgresql://u:p@ep-main-123.c-4.ap-southeast-1.aws.neon.tech/db?sslmode=require';
const TEST = 'postgresql://u:p@ep-test-456.c-4.ap-southeast-1.aws.neon.tech/db?sslmode=require';

describe('endpointOf', () => {
  it('treats the pooled and direct strings of one branch as the same endpoint', () => {
    expect(endpointOf(MAIN_POOLED)).toBe(endpointOf(MAIN_DIRECT));
    expect(endpointOf(TEST)).not.toBe(endpointOf(MAIN_DIRECT));
  });
});

describe('assertSafeTestUrl', () => {
  it('accepts a different branch', () => {
    expect(assertSafeTestUrl(TEST, [MAIN_POOLED, MAIN_DIRECT], 'test')).toBe(TEST);
  });

  it('refuses the main branch, pooled or direct', () => {
    expect(() => assertSafeTestUrl(MAIN_DIRECT, [MAIN_POOLED, MAIN_DIRECT], 'test')).toThrow('Refusing');
    expect(() => assertSafeTestUrl(MAIN_POOLED, [undefined, MAIN_DIRECT], 'test')).toThrow('Refusing');
  });

  it('refuses when no test string is set', () => {
    expect(() => assertSafeTestUrl(undefined, [MAIN_DIRECT], 'test')).toThrow('TEST_DATABASE_URL');
    expect(() => assertSafeTestUrl('', [MAIN_DIRECT], 'test')).toThrow('TEST_DATABASE_URL');
  });

  it('refuses in production', () => {
    expect(() => assertSafeTestUrl(TEST, [MAIN_DIRECT], 'production')).toThrow('production');
  });
});
