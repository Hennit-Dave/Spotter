const LAGOS = 'Africa/Lagos';

const lagosParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: LAGOS,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// The calendar date in Africa/Lagos for an instant, as YYYY-MM-DD. This converts the instant
// to the Lagos zone first and then takes the date part. Truncating a UTC timestamp is wrong
// for anything after 11pm Lagos time (see data-model.md).
export function lagosDate(instant: Date = new Date()): string {
  return lagosParts.format(instant);
}

// Parses a YYYY-MM-DD calendar date. Returns the midnight-UTC Date that stores it, or null
// when the text is not a real date.
export function parseCalendarDate(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

// The calendar date held by a stored date, as YYYY-MM-DD. Reads UTC parts only.
export function calendarDateText(stored: Date): string {
  return stored.toISOString().slice(0, 10);
}
