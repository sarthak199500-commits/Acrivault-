/**
 * Formatting utilities. Everything that prints a number or date in the product
 * goes through here so figures stay tabular and locale-correct.
 */

const LOCALE = 'en-US';

const countFmt = new Intl.NumberFormat(LOCALE, { useGrouping: true });
const compactFmt = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const percentFmt = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  maximumFractionDigits: 0,
});
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const dateFmt = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });
const relFmt = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/** Grouped integer, e.g. 51,204. Pair with the `.tnum` utility when rendering. */
export function count(n: number): string {
  return countFmt.format(n);
}

/** Compact figure for tiles, e.g. 1.2K, 3.4M. */
export function compact(n: number): string {
  return compactFmt.format(n);
}

/** Grouped count with singular/plural agreement, e.g. "1 identity" / "5 identities". */
export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${count(n)} ${n === 1 ? singular : plural}`;
}

export function percent(fraction: number): string {
  return percentFmt.format(fraction);
}

export function dateTime(iso: string | Date): string {
  return dateTimeFmt.format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function date(iso: string | Date): string {
  return dateFmt.format(typeof iso === 'string' ? new Date(iso) : iso);
}

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

/** Human relative time, e.g. "3 hours ago", "in 2 days". */
export function relativeTime(iso: string | Date, now: Date = new Date()): string {
  const then = typeof iso === 'string' ? new Date(iso) : iso;
  let duration = (then.getTime() - now.getTime()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relFmt.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return dateFmt.format(then);
}

/**
 * Whole-day relative time, e.g. "Today", "1 day ago", "32 days ago". Unlike
 * relativeTime, which rolls up into weeks/months, this always reports in days.
 */
export function relativeDays(iso: string | Date, now: Date = new Date()): string {
  const then = typeof iso === 'string' ? new Date(iso) : iso;
  const days = Math.round((now.getTime() - then.getTime()) / 86400000);
  if (days < 0) return `in ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'}`;
  if (days === 0) return 'Today';
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

/** Compact duration from milliseconds, e.g. "12 min", "2h 5m", "45s". */
export function duration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}
