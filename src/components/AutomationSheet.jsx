import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { DAYS, DEFAULT_AC, TEMP_MAX, TEMP_MIN, WINDS } from '../lib/constants';
import { deviceId, deviceName, kindOf, switchChannels } from '../lib/devices';
import { ModePicker, Segmented, Sheet } from './ui';

const DURATIONS = [0, 15, 30, 45, 60, 90, 120];
const PRESETS = [
  { label: 'כל יום', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'ימים א׳ עד ה׳', days: [0, 1, 2, 3, 4] },
  { label: 'שישי ושבת', days: [5, 6] },
];

const channelLabel = (code, i) => {
  const n = /(\d+)$/.exec(code);
  return `ערוץ ${n ? n[1] : i + 1}`;
};

export default function AutomationSheet({ groups, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [action, setAction] = useState('turn_on');
  const [channel, setChannel] = useState('');
  const [time, setTime] = useState('07:00');
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [duration, setDuration] = useState(0);
  const [customDuration, setCustomDuration] = useState(false);
  const [ac, setAc] = useState({ temp: DEFAULT_AC.temp, mode: DEFAULT_AC.mode, wind: DEFAULT_AC.wind });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const all = useMemo(() => [...groups.ac, ...groups.tv, ...groups.switch], [groups]);
  const device = all.find((d) => deviceId(d) === selectedId) || null;
  const kind = device ? kindOf(device) : null;
  const channels = device && kind === 'switch' ? switchChannels(device) : [];
  const turningOn = action === 'turn_on';

  const pickDevice = (id) => {
    setSelectedId(id);
    const d = all.find((x) => deviceId(x) === id);
    const k = d ? kindOf(d) : null;
    const first = d && k === 'switch' ? switchChannels(d)[0] : null;
    setChannel(first ? first.code : '');
    // Plugs and boilers are the ones that get left on, so they default to switching off later.
    setDuration(k === 'switch' ? 45 : 0);
    setCustomDuration(false);
  };

  const toggleDay = (d) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const submit = async (e) => {
    e.preventDefault();
    if (!device || days.length === 0) return;
    setBusy(true);
    setError('');
    const name = deviceName(device);
    const payload = {
      title: title.trim() || `${turningOn ? 'הדלקת' : 'כיבוי'} ${name}`,
      deviceId: deviceId(device),
      deviceName: name,
      infraredId: device.infraredId || null,
      remoteIndex: device.remote_index || null,
      type: kind,
      action,
      time,
      days,
      durationMinutes: turningOn && kind !== 'tv' ? Number(duration) || 0 : 0,
      ...(kind === 'switch' && channel ? { switchCode: channel } : {}),
      ...(kind === 'ac' && turningOn ? { temp: ac.temp, mode: ac.mode, wind: ac.wind } : {}),
    };
    try {
      await onSave(payload);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Sheet title="תזמון חדש" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div>
          <label className="field-label" htmlFor="auto-device">מכשיר</label>
          <select id="auto-device" className="select" value={selectedId} onChange={(e) => pickDevice(e.target.value)} required>
            <option value="">בחירת מכשיר…</option>
            {groups.ac.length > 0 && (
              <optgroup label="מזגנים">
                {groups.ac.map((d) => <option key={deviceId(d)} value={deviceId(d)}>{deviceName(d)}</option>)}
              </optgroup>
            )}
            {groups.tv.length > 0 && (
              <optgroup label="טלוויזיות">
                {groups.tv.map((d) => <option key={deviceId(d)} value={deviceId(d)}>{deviceName(d)}</option>)}
              </optgroup>
            )}
            {groups.switch.length > 0 && (
              <optgroup label="מתגים ושקעים">
                {groups.switch.map((d) => <option key={deviceId(d)} value={deviceId(d)}>{deviceName(d)}</option>)}
              </optgroup>
            )}
          </select>
        </div>

        {channels.length > 1 && (
          <div>
            <span className="field-label">ערוץ</span>
            <Segmented
              label="ערוץ"
              value={channel}
              onChange={setChannel}
              options={channels.map((c, i) => ({ value: c.code, label: channelLabel(c.code, i) }))}
            />
          </div>
        )}

        <div>
          <span className="field-label">פעולה</span>
          <Segmented
            label="פעולה"
            value={action}
            onChange={setAction}
            options={[{ value: 'turn_on', label: 'הדלקה' }, { value: 'turn_off', label: 'כיבוי' }]}
          />
          {kind === 'tv' && (
            <p className="hint">שלט IR שולח פקודה אחת להדלקה ולכיבוי, כמו הכפתור בשלט.</p>
          )}
        </div>

        {kind === 'ac' && turningOn && (
          <div className="ac-settings">
            <span className="field-label">הגדרות מזגן בהדלקה</span>
            <div className="mini-stepper">
              <button type="button" aria-label="הורדת טמפרטורה" disabled={ac.temp <= TEMP_MIN} onClick={() => setAc((s) => ({ ...s, temp: s.temp - 1 }))}><Minus size={20} /></button>
              <span aria-live="polite">{ac.temp}°</span>
              <button type="button" aria-label="העלאת טמפרטורה" disabled={ac.temp >= TEMP_MAX} onClick={() => setAc((s) => ({ ...s, temp: s.temp + 1 }))}><Plus size={20} /></button>
            </div>
            <ModePicker value={ac.mode} onChange={(mode) => setAc((s) => ({ ...s, mode }))} />
            <span className="field-label" style={{ marginTop: 14 }}>עוצמת מאוורר</span>
            <Segmented label="עוצמת מאוורר" options={WINDS} value={ac.wind} onChange={(wind) => setAc((s) => ({ ...s, wind }))} />
          </div>
        )}

        <div>
          <label className="field-label" htmlFor="auto-time">שעה</label>
          <input id="auto-time" className="input time-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>

        <div>
          <span className="field-label">ימים</span>
          <div className="days" role="group" aria-label="ימים בשבוע">
            {DAYS.map((d) => (
              <button
                type="button"
                key={d.value}
                className="day"
                aria-pressed={days.includes(d.value)}
                aria-label={`יום ${d.name}`}
                onClick={() => toggleDay(d.value)}
              >
                {d.short}
              </button>
            ))}
          </div>
          <div className="presets">
            {PRESETS.map((p) => (
              <button type="button" key={p.label} onClick={() => setDays(p.days)}>{p.label}</button>
            ))}
          </div>
        </div>

        {turningOn && kind !== 'tv' && (
          <div>
            <span className="field-label">כיבוי אוטומטי אחרי</span>
            <div className="chips">
              {DURATIONS.map((m) => (
                <button
                  type="button"
                  key={m}
                  className="chip"
                  aria-pressed={!customDuration && duration === m}
                  onClick={() => { setDuration(m); setCustomDuration(false); }}
                >
                  {m === 0 ? 'ללא' : `${m} דק׳`}
                </button>
              ))}
              <button type="button" className="chip" aria-pressed={customDuration} onClick={() => setCustomDuration(true)}>
                אחר
              </button>
            </div>
            {customDuration && (
              <input
                className="input"
                style={{ marginTop: 10 }}
                type="number"
                min="1"
                max="1440"
                inputMode="numeric"
                aria-label="משך בדקות"
                placeholder="מספר דקות"
                value={duration || ''}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            )}
          </div>
        )}

        <div>
          <label className="field-label" htmlFor="auto-title">שם (לא חובה)</label>
          <input
            id="auto-title"
            className="input"
            type="text"
            maxLength={60}
            placeholder={device ? `${turningOn ? 'הדלקת' : 'כיבוי'} ${deviceName(device)}` : 'למשל: דוד בבוקר'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {error && <p className="aerror" role="alert">{error}</p>}

        <button type="submit" className="btn block" disabled={!device || days.length === 0 || busy}>
          {busy ? 'שומר…' : 'שמירת תזמון'}
        </button>
      </form>
    </Sheet>
  );
}
