import { randomInt } from 'node:crypto';

// The 31 characters allowed after SPT-: the letters A to Z without I, L and O, and the
// digits 2 to 9. The removed characters are the ones people misread when copying an ID.
export const MEMBERSHIP_ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const BODY_LENGTH = 4;
const PREFIX = 'SPT-';

// Generates a random ID in the form SPT-XXXX. randomInt is unbiased, so every character is
// equally likely. The caller checks the ID is unused and retries on a collision.
export function generateMembershipId(): string {
  let body = '';
  for (let i = 0; i < BODY_LENGTH; i++) {
    body += MEMBERSHIP_ID_ALPHABET[randomInt(MEMBERSHIP_ID_ALPHABET.length)];
  }
  return PREFIX + body;
}

// Accepts an ID in any case, with or without the dash, with spaces around or inside it, and
// returns it as SPT-XXXX. Returns null when the text is not a possible ID.
export function normaliseMembershipId(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]+/g, '');
  if (!compact.startsWith('SPT')) return null;
  const body = compact.slice(3);
  if (body.length !== BODY_LENGTH) return null;
  for (const char of body) {
    if (!MEMBERSHIP_ID_ALPHABET.includes(char)) return null;
  }
  return PREFIX + body;
}
