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

export function Toasts({ toasts }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'error' ? 'error' : ''}`}>{t.message}</div>
      ))}
    </div>
  );
}
