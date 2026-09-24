import { useEffect, useRef, useState } from 'react';
import { AirVent, Minus, Plus, Power } from 'lucide-react';
import { api } from '../api';
import { loadAcState, saveAcState } from '../session';
import { deviceId, deviceName } from '../lib/devices';
import { DEFAULT_AC, MODES, TEMP_MAX, TEMP_MIN, WINDS } from '../lib/constants';
import { ModePicker, Segmented } from './ui';

// Dial geometry: a 240° arc with the gap at the bottom, where the − / + buttons sit.
const CX = 118;
const CY = 110;
const R = 92;
const START = 150;
const SWEEP = 240;
const point = (deg) => [CX + R * Math.cos((deg * Math.PI) / 180), CY + R * Math.sin((deg * Math.PI) / 180)];
const [X0, Y0] = point(START);
const [X1, Y1] = point(START + SWEEP);
const ARC = `M ${X0.toFixed(2)} ${Y0.toFixed(2)} A ${R} ${R} 0 1 1 ${X1.toFixed(2)} ${Y1.toFixed(2)}`;

const clamp = (t) => Math.min(TEMP_MAX, Math.max(TEMP_MIN, t));

function Dial({ temp, color, on, caption }) {
  const fraction = (temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);
  const [tx, ty] = point(START + SWEEP * fraction);
  return (
    <>
      <svg viewBox="0 0 236 200" aria-hidden="true">
        <path className="dial-track" d={ARC} fill="none" strokeWidth="14" strokeLinecap="round" />
        <path
          className="dial-progress"
          d={ARC}
          pathLength="100"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${fraction * 100} 100`}
        />
        <circle className="dial-thumb" cx={tx} cy={ty} r="9" stroke={color} />
      </svg>
      <div className="dial-readout">
        <div className="dial-temp" aria-live="polite">
          {temp}<sup>°</sup>
        </div>
        <div className="dial-caption">{on ? caption : 'כבוי'}</div>
      </div>
    </>
  );
}

export default function AcCard({ device, toast }) {
  const id = deviceId(device);
  const hub = device.infraredId;
  const unavailable = !device.online || !hub;

  const [state, setState] = useState(() => ({ ...DEFAULT_AC, ...(loadAcState(id) || {}) }));
  const stateRef = useRef(state); // latest value, for use inside timers
  const confirmed = useRef(state); // last state the server accepted
  const tempTimer = useRef(null);

  const commit = (next) => { stateRef.current = next; setState(next); };

  // IR is one-way, so Tuya reports the last command it sent. Use that when available.
  useEffect(() => {
    if (!hub) return undefined;
    let alive = true;
    api.getAcStatus(hub, id).then((remote) => {
      if (!alive || !remote) return;
      const merged = { ...stateRef.current };
      for (const key of ['power', 'mode', 'temp', 'wind']) {
        if (Number.isFinite(remote[key])) merged[key] = remote[key];
      }
      merged.temp = clamp(merged.temp);
      confirmed.current = merged;
      commit(merged);
      saveAcState(id, merged);
    }).catch(() => { /* fall back to what this device last did */ });
    return () => { alive = false; };
  }, [id, hub]);

  const send = async (code, value) => {
    try {
      await api.sendAc(hub, id, code, value);
      confirmed.current = { ...confirmed.current, [code]: value };
      saveAcState(id, confirmed.current);
    } catch (err) {
      commit({ ...stateRef.current, [code]: confirmed.current[code] });
      toast(err.message, 'error');
    }
  };

  const setPower = (on) => { commit({ ...stateRef.current, power: on ? 1 : 0 }); send('power', on ? 1 : 0); };
  const setMode = (mode) => { commit({ ...stateRef.current, mode }); send('mode', mode); };
  const setWind = (wind) => { commit({ ...stateRef.current, wind }); send('wind', wind); };

  // Every IR command takes a moment, so wait until the taps stop before sending.
  const bump = (delta) => {
    const temp = clamp(stateRef.current.temp + delta);
    if (temp === stateRef.current.temp) return;
    commit({ ...stateRef.current, temp });
    clearTimeout(tempTimer.current);
    tempTimer.current = setTimeout(() => send('temp', stateRef.current.temp), 600);
  };

  const on = state.power === 1;
  const mode = MODES.find((m) => m.value === state.mode) || MODES[0];

  return (
    <section
      className={`ac ${on ? 'on' : ''} ${unavailable ? 'offline' : ''}`}
      style={{ '--tint': mode.color }}
      aria-label={deviceName(device)}
    >
      <div className="card-head">
        <div className="card-icon"><AirVent size={22} /></div>
        <div className="card-titles">
          <h3 className="card-title">{deviceName(device)}</h3>
          <div className="card-sub">
            <span className={`dot ${device.online ? 'live' : ''}`} />
            {device.online ? 'מחובר' : 'לא מחובר'}
            {device.brand_name ? <span>{device.brand_name}</span> : null}
          </div>
        </div>
        <button
          type="button"
          className="power-btn"
          aria-pressed={on}
          aria-label={on ? 'כיבוי המזגן' : 'הדלקת המזגן'}
          disabled={unavailable}
          onClick={() => setPower(!on)}
        >
          <Power size={21} />
        </button>
      </div>

      <div className={`dial ${on ? '' : 'off'}`}>
        <Dial temp={state.temp} color={mode.color} on={on} caption={mode.label} />
        <button type="button" className="step minus" aria-label="הורדת טמפרטורה" disabled={unavailable || state.temp <= TEMP_MIN} onClick={() => bump(-1)}>
          <Minus size={22} />
        </button>
        <button type="button" className="step plus" aria-label="העלאת טמפרטורה" disabled={unavailable || state.temp >= TEMP_MAX} onClick={() => bump(1)}>
          <Plus size={22} />
        </button>
      </div>

      <ModePicker value={state.mode} onChange={setMode} disabled={unavailable} />

      <span className="field-label">עוצמת מאוורר</span>
      <Segmented label="עוצמת מאוורר" options={WINDS} value={state.wind} onChange={setWind} disabled={unavailable} />
    </section>
  );
}
