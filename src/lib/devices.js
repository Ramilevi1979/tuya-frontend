import { Plug, Lightbulb, ShowerHead } from 'lucide-react';

export const deviceId = (d) => d.id || d.remote_id;
export const deviceName = (d) => d.name || d.remote_name || 'מכשיר ללא שם';

const HUB_CATEGORIES = new Set(['wnykq', 'pjkq', 'ykq']);
const LIGHT_CATEGORIES = new Set(['dj', 'dd', 'xdd', 'fwd', 'dc']);

/** 'ac' | 'tv' | 'hub' | 'switch' */
export function kindOf(d) {
  if (HUB_CATEGORIES.has(d.category)) return 'hub';
  const names = `${d.name || ''} ${d.remote_name || ''}`;
  if (d.category === 'infrared_ac' || String(d.category_id) === '5' || names.includes('מזגן')) return 'ac';
  if (
    d.category === 'infrared_tv' ||
    String(d.category_id) === '2' ||
    /TV|טלוויזיה|טלויזיה/.test(names)
  ) return 'tv';
  return 'switch';
}

/** On/off channels of a plug or switch (a two-gang switch has switch_1 and switch_2). */
export const switchChannels = (d) =>
  (d.status || []).filter(
    (s) => typeof s.code === 'string' && s.code.startsWith('switch') && typeof s.value === 'boolean',
  );

export function iconFor(d) {
  const name = deviceName(d);
  if (/דוד|מקלחת|boiler/i.test(name)) return ShowerHead;
  if (LIGHT_CATEGORIES.has(d.category) || /תאורה|מנורה|אור|light/i.test(name)) return Lightbulb;
  return Plug;
}

/** Hubs and duplicates out; plugs with nothing to switch out; sorted into the groups the UI shows. */
export function groupDevices(devices) {
  const seen = new Set();
  const groups = { ac: [], tv: [], switch: [] };
  for (const device of devices) {
    const id = deviceId(device);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const kind = kindOf(device);
    if (kind === 'hub') continue;
    if (kind === 'switch' && switchChannels(device).length === 0) continue;
    groups[kind].push(device);
  }
  return groups;
}
