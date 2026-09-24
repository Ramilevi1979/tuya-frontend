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
