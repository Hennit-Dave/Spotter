import { describe, expect, it } from 'vitest';
import {
  MEMBERSHIP_ID_ALPHABET,
  generateMembershipId,
  normaliseMembershipId,
} from './membership-id';

describe('the alphabet', () => {
  it('has 31 characters and leaves out I, L, O and the digits 0 and 1', () => {
    expect(MEMBERSHIP_ID_ALPHABET).toHaveLength(31);
    expect(new Set(MEMBERSHIP_ID_ALPHABET).size).toBe(31);
    for (const banned of ['I', 'L', 'O', '0', '1']) {
      expect(MEMBERSHIP_ID_ALPHABET).not.toContain(banned);
    }
  });
});

describe('generateMembershipId', () => {
  it('always returns SPT- followed by four characters from the alphabet', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateMembershipId()).toMatch(/^SPT-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{4}$/);
    }
  });

  it('varies', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateMembershipId()));
    expect(ids.size).toBeGreaterThan(150);
  });
});

describe('normaliseMembershipId (gate: ID normalisation)', () => {
  it('resolves spt7k4q, SPT 7K4Q and SPT-7K4Q to the same ID', () => {
    for (const typed of ['spt7k4q', 'SPT 7K4Q', 'SPT-7K4Q', '  spt-7k4q  ', 'Spt 7k 4q']) {
      expect(normaliseMembershipId(typed)).toBe('SPT-7K4Q');
    }
  });

  it('rejects text that cannot be an ID', () => {
    for (const bad of ['', 'SPT', 'SPT-7K4', 'SPT-7K4QX', 'ABC-7K4Q', 'SPT-7K4I', 'SPT-7K40', 'SPT-7K4!']) {
      expect(normaliseMembershipId(bad)).toBeNull();
    }
  });
});
