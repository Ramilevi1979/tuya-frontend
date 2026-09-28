import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { MODES } from '../lib/constants';

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="toggle"
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  );
}

export function Segmented({ options, value, onChange, label, disabled }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          aria-pressed={o.value === value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ModePicker({ value, onChange, disabled }) {
  return (
    <div className="modes" role="group" aria-label="מצב עבודה">
      {MODES.map(({ value: v, label, icon: Icon, color }) => (
        <button
          type="button"
          key={v}
          className="mode"
          style={{ '--c': color }}
          aria-pressed={v === value}
          disabled={disabled}
          onClick={() => onChange(v)}
        >
          <Icon size={20} />
          {label}
        </button>
      ))}
    </div>
  );
}

/** Bottom sheet: closes on Escape or a tap outside, keeps the page behind it from scrolling. */
export function Sheet({ title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="סגירה" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

/**
 * A 24-hour time picker built from two <select> elements, so the display never
 * depends on the browser or device's own locale (unlike a native <input type="time">,
 * which some browsers render as 12-hour with AM/PM regardless of page language).
 */
export function TimeField({ label, value, onChange, compact }) {
  const [h, m] = (value || '00:00').split(':');
  return (
    <div className={`time-field ${compact ? 'compact' : ''}`} role="group" aria-label={label}>
      <select aria-label={`${label}, שעה`} className="time-select" value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)}>
        {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="time-colon">:</span>
      <select aria-label={`${label}, דקה`} className="time-select" value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)}>
        {MINUTES.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );
}

export function Toasts({ toasts }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'error' ? 'error' : ''}`}>{t.message}</div>
      ))}
    </div>
  );
}
