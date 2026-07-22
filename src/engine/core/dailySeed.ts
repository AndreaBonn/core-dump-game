/**
 * Map a calendar day to a stable 32-bit seed. Every player who starts the daily
 * challenge on the same local date gets the same layout, and a given date always
 * yields the same number (pure, side-effect free). Only the year/month/day are
 * read, so the time of day never changes the result.
 */
export function dailySeed(date: Date): number {
  const dayKey = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  let h = dayKey >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return h >>> 0;
}
