// Turns a typed phone number into international digits only, for example 2348074652543.
// The rule is written in data-model.md. Returns null for anything it cannot place with
// confidence. It never guesses.
export function normalisePhone(input: string): string | null {
  const text = input.trim();
  if (!/^[0-9+()\-.\s]+$/.test(text)) return null;
  // A plus is only allowed as the very first character.
  if (text.lastIndexOf('+') > 0) return null;

  const hasPlus = text.startsWith('+');
  let digits = text.replace(/\D/g, '');

  let international = hasPlus;
  if (!hasPlus && digits.startsWith('00')) {
    digits = digits.slice(2);
    international = true;
  }

  // 234 followed by a 0 is a local number with the country code stuck on the front.
  if (digits.startsWith('2340')) digits = '234' + digits.slice(4);

  if (international || digits.startsWith('234')) {
    if (digits.startsWith('234')) return digits.length === 13 ? digits : null;
    return /^[1-9][0-9]{7,14}$/.test(digits) ? digits : null;
  }

  // Nigerian local forms: 0 then 10 digits, or the 10 digits alone starting 7, 8 or 9.
  if (/^0[0-9]{10}$/.test(digits)) return '234' + digits.slice(1);
  if (/^[789][0-9]{9}$/.test(digits)) return '234' + digits;
  return null;
}
