import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  DAYS, DEFAULT_AC, TEMP_MAX, TEMP_MIN, WINDS,
  describeEvery, formatDuration, localDateKey, toMinutes,
} from '../lib/constants';
import { deviceId, deviceName, kindOf, switchChannels } from '../lib/devices';
import { ModePicker, Segmented, Sheet } from './ui';

const OFF_AFTER = [0, 15, 30, 45, 60, 90, 120];
const EVERY = [30, 60, 90, 120, 180];
const PULSE = [10, 15, 20, 30, 45];
const PRESETS = [
  { label: 'כל יום', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'ימים א׳ עד ה׳', days: [0, 1, 2, 3, 4] },
  { label: 'שישי ושבת', days: [5, 6] },
];
const KINDS = [
  { value: 'weekly', label: 'שבועי' },
  { value: 'once', label: 'חד פעמי' },
  { value: 'interval', label: 'מחזורי' },
];

const channelLabel = (code, i) => {
  const n = /(\d+)$/.exec(code);
  return `ערוץ ${n ? n[1] : i + 1}`;
};

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** Tomorrow if today's default time has already passed. */
function defaultOnceDate() {
  const d = new Date();
  if (nowMinutes() >= 7 * 60) d.setDate(d.getDate() + 1);
  return localDateKey(d);
}

/** A row of preset chips plus "other", which reveals a number field. */
function ChipsWithCustom({ options, value, onChange, format, max = 1440, label }) {
  const [custom, setCustom] = useState(!options.includes(value));
  return (
    <>
      <div className="chips">
        {options.map((m) => (
          <button
            type="button"
            key={m}
            className="chip"
            aria-pressed={!custom && value === m}
            onClick={() => { onChange(m); setCustom(false); }}
          >
            {format(m)}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={custom} onClick={() => setCustom(true)}>אחר</button>
      </div>
      {custom && (
        <input
          className="input"
          style={{ marginTop: 10 }}
          type="number"
          min="1"
          max={max}
          inputMode="numeric"
          aria-label={`${label} בדקות`}
          placeholder="מספר דקות"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
    </>
  );
}

export default function AutomationSheet({ groups, onSave, onClose }) {
  const [kind, setKind] = useState('weekly');
  const [title, setTitle] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [action, setAction] = useState('turn_on');
  const [channel, setChannel] = useState('');
  const [time, setTime] = useState('07:00');
  const [endTime, setEndTime] = useState('06:00');
  const [date, setDate] = useState(defaultOnceDate);
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [duration, setDuration] = useState(0);
  const [every, setEvery] = useState(60);
  const [pulse, setPulse] = useState(20);
  const [ac, setAc] = useState({ temp: DEFAULT_AC.temp, mode: DEFAULT_AC.mode, wind: DEFAULT_AC.wind });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const all = useMemo(() => [...groups.ac, ...groups.tv, ...groups.switch], [groups]);
  const device = all.find((d) => deviceId(d) === selectedId) || null;
  const type = device ? kindOf(device) : null;
  const channels = device && type === 'switch' ? switchChannels(device) : [];
  const isInterval = kind === 'interval';
  const turningOn = isInterval || action === 'turn_on';

  // Reasons the form can't be saved yet, shown under the button.
  const problem = (() => {
    if (!device) return '';
    if (isInterval && type === 'tv') return 'תזמון מחזורי לא זמין לטלוויזיה.';
    if (isInterval && time === endTime) return 'שעת הסיום חייבת להיות שונה משעת ההתחלה.';
    if (isInterval && pulse >= every) return 'משך ההפעלה חייב להיות קצר מהמרווח בין ההפעלות.';
    if (isInterval && (!pulse || pulse < 1)) return 'יש להגדיר משך הפעלה.';
    if (kind === 'once' && (date < localDateKey() || (date === localDateKey() && toMinutes(time) <= nowMinutes()))) {
      return 'התאריך והשעה כבר עברו.';
    }
    if (kind !== 'once' && days.length === 0) return 'יש לבחור לפחות יום אחד.';
    return '';
  })();

  const windowLength = (toMinutes(endTime) - toMinutes(time) + 1440) % 1440;
  const pulses = windowLength && every ? Math.floor((windowLength - 1) / every) + 1 : 0;

  const pickDevice = (id) => {
    setSelectedId(id);
    const d = all.find((x) => deviceId(x) === id);
    const t = d ? kindOf(d) : null;
    const first = d && t === 'switch' ? switchChannels(d)[0] : null;
    setChannel(first ? first.code : '');
    // Plugs and boilers are the ones that get left on, so they default to switching off later.
    setDuration(t === 'switch' ? 45 : 0);
  };

  const pickKind = (next) => {
    setKind(next);
    // Sensible starting times, unless the person already chose their own.
    if (next === 'interval' && time === '07:00') setTime('23:00');
    if (next !== 'interval' && time === '23:00') setTime('07:00');
  };

  const toggleDay = (d) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const submit = async (e) => {
    e.preventDefault();
    if (!device || problem) return;
    setBusy(true);
    setError('');
    const name = deviceName(device);
    const payload = {
      kind,
      title: title.trim() || (isInterval ? `הפעלה מחזורית: ${name}` : `${turningOn ? 'הדלקת' : 'כיבוי'} ${name}`),
      deviceId: deviceId(device),
      deviceName: name,
      infraredId: device.infraredId || null,
      remoteIndex: device.remote_index || null,
      type,
      action: isInterval ? 'turn_on' : action,
      time,
      days: kind === 'once' ? [] : days,
      durationMinutes: isInterval ? pulse : (turningOn && type !== 'tv' ? Number(duration) || 0 : 0),
      ...(kind === 'once' ? { date } : {}),
      ...(isInterval ? { endTime, everyMinutes: every } : {}),
      ...(type === 'switch' && channel ? { switchCode: channel } : {}),
      ...(type === 'ac' && turningOn ? { temp: ac.temp, mode: ac.mode, wind: ac.wind } : {}),
    };
    try {
      await onSave(payload);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const placeholder = device
    ? (isInterval ? `הפעלה מחזורית: ${deviceName(device)}` : `${turningOn ? 'הדלקת' : 'כיבוי'} ${deviceName(device)}`)
    : 'למשל: דוד בבוקר';

  return (
    <Sheet title="תזמון חדש" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div>
          <span className="field-label">סוג תזמון</span>
          <Segmented label="סוג תזמון" value={kind} onChange={pickKind} options={KINDS} />
          {kind === 'once' && <p className="hint">ירוץ פעם אחת בתאריך שתבחרו, ואז ייסגר.</p>}
          {isInterval && <p className="hint">למשל: להדליק את המזגן ל־20 דקות בכל שעה במשך הלילה.</p>}
        </div>

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

        {!isInterval && (
          <div>
            <span className="field-label">פעולה</span>
            <Segmented
              label="פעולה"
              value={action}
              onChange={setAction}
              options={[{ value: 'turn_on', label: 'הדלקה' }, { value: 'turn_off', label: 'כיבוי' }]}
            />
            {type === 'tv' && (
              <p className="hint">שלט IR שולח פקודה אחת להדלקה ולכיבוי, כמו הכפתור בשלט.</p>
            )}
          </div>
        )}

        {type === 'ac' && turningOn && (
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

        {kind === 'once' && (
          <div>
            <label className="field-label" htmlFor="auto-date">תאריך</label>
            <input id="auto-date" className="input date-input" type="date" min={localDateKey()} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        )}

        {isInterval ? (
          <div className="two">
            <div>
              <label className="field-label" htmlFor="auto-time">מתחיל ב</label>
              <input id="auto-time" className="input time-input compact" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
            <div>
              <label className="field-label" htmlFor="auto-end">מסתיים ב</label>
              <input id="auto-end" className="input time-input compact" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>
        ) : (
          <div>
            <label className="field-label" htmlFor="auto-time">שעה</label>
            <input id="auto-time" className="input time-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        )}

        {isInterval && (
          <>
            <div>
              <span className="field-label">מדליק כל</span>
              <ChipsWithCustom key={`every-${selectedId}`} label="מרווח" options={EVERY} value={every} onChange={setEvery} format={(m) => (m === 60 ? 'שעה' : formatDuration(m))} max={720} />
            </div>
            <div>
              <span className="field-label">ומשאיר דלוק למשך</span>
              <ChipsWithCustom key={`pulse-${selectedId}`} label="משך" options={PULSE} value={pulse} onChange={setPulse} format={(m) => `${m} דק׳`} max={719} />
            </div>
            {!problem && pulses > 0 && (
              <p className="summary">
                {pulses} הפעלות בין {time} ל־{endTime}, {describeEvery(every)} למשך {formatDuration(pulse)}.
              </p>
            )}
          </>
        )}

        {kind !== 'once' && (
          <div>
            <span className="field-label">{isInterval ? 'ימים (התקופה מתחילה בערב של היום שנבחר)' : 'ימים'}</span>
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
        )}

        {!isInterval && turningOn && type !== 'tv' && (
          <div>
            <span className="field-label">כיבוי אוטומטי אחרי</span>
            <ChipsWithCustom key={`off-${selectedId}`} label="כיבוי" options={OFF_AFTER} value={duration} onChange={setDuration} format={(m) => (m === 0 ? 'ללא' : `${m} דק׳`)} />
          </div>
        )}

        <div>
          <label className="field-label" htmlFor="auto-title">שם (לא חובה)</label>
          <input
            id="auto-title"
            className="input"
            type="text"
            maxLength={60}
            placeholder={placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {(error || problem) && <p className="aerror" role="alert">{error || problem}</p>}

        <button type="submit" className="btn block" disabled={!device || Boolean(problem) || busy}>
          {busy ? 'שומר…' : 'שמירת תזמון'}
        </button>
      </form>
    </Sheet>
  );
}
