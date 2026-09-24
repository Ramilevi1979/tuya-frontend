import { Snowflake, Flame, Sparkles, Fan, Droplets } from 'lucide-react';

export const MODES = [
  { value: 0, label: 'קירור', icon: Snowflake, color: 'var(--cool)' },
  { value: 1, label: 'חימום', icon: Flame, color: 'var(--heat)' },
  { value: 2, label: 'אוטו', icon: Sparkles, color: 'var(--auto)' },
  { value: 3, label: 'מאוורר', icon: Fan, color: 'var(--fan)' },
  { value: 4, label: 'ייבוש', icon: Droplets, color: 'var(--dry)' },
];

export const WINDS = [
  { value: 0, label: 'אוטו' },
  { value: 1, label: 'נמוך' },
  { value: 2, label: 'בינוני' },
  { value: 3, label: 'גבוה' },
];

export const TEMP_MIN = 16;
export const TEMP_MAX = 30;

// Index = JavaScript weekday (0 = Sunday), same as the server.
export const DAYS = [
  { value: 0, short: 'א', name: 'ראשון' },
  { value: 1, short: 'ב', name: 'שני' },
  { value: 2, short: 'ג', name: 'שלישי' },
  { value: 3, short: 'ד', name: 'רביעי' },
  { value: 4, short: 'ה', name: 'חמישי' },
  { value: 5, short: 'ו', name: 'שישי' },
  { value: 6, short: 'ש', name: 'שבת' },
];

export const DEFAULT_AC = { power: 0, temp: 24, mode: 0, wind: 0 };

export function describeDays(days) {
  const key = [...days].sort().join('');
  if (key === '0123456') return 'כל יום';
  if (key === '01234') return 'ימים א׳ עד ה׳';
  if (key === '56') return 'שישי ושבת';
  return days.map((d) => `${DAYS[d].short}׳`).join(' ');
}

export function formatDuration(minutes) {
  if (minutes === 60) return 'שעה';
  if (minutes === 90) return 'שעה וחצי';
  if (minutes === 120) return 'שעתיים';
  if (minutes % 60 === 0) return `${minutes / 60} שעות`;
  return `${minutes} דקות`;
}

export function describeEvery(minutes) {
  if (minutes === 60) return 'כל שעה';
  if (minutes === 120) return 'כל שעתיים';
  if (minutes % 60 === 0) return `כל ${minutes / 60} שעות`;
  return `כל ${minutes} דקות`;
}

const pad = (n) => String(n).padStart(2, '0');

/** YYYY-MM-DD in the device's local time (what <input type="date"> uses). */
export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function describeDate(dateKey) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateKey === localDateKey()) return 'היום';
  if (dateKey === localDateKey(tomorrow)) return 'מחר';
  const [, m, d] = dateKey.split('-').map(Number);
  return `${d}.${m}`;
}

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
