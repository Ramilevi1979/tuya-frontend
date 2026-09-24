import { useMemo, useState } from 'react';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { MODES, describeDays } from '../lib/constants';
import { Toggle } from './ui';

export function formatDuration(minutes) {
  if (minutes === 60) return 'שעה';
  if (minutes === 90) return 'שעה וחצי';
  if (minutes === 120) return 'שעתיים';
  if (minutes % 60 === 0) return `${minutes / 60} שעות`;
  return `${minutes} דקות`;
}

export default function AutomationsView({ automations, loaded, onAdd, onToggle, onRemove }) {
  const [confirmId, setConfirmId] = useState(null);

  const sorted = useMemo(
    () => [...automations].sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title, 'he')),
    [automations],
  );

  return (
    <div>
      <div className="page-head">
        <h2>תזמונים</h2>
        {sorted.length > 0 && (
          <button type="button" className="btn small" onClick={onAdd}>
            <Plus size={17} /> תזמון חדש
          </button>
        )}
      </div>

      {!loaded ? (
        <div className="skeleton" style={{ height: 96 }} />
      ) : sorted.length === 0 ? (
        <div className="empty">
          <CalendarClock size={34} strokeWidth={1.6} />
          <h3>אין תזמונים עדיין</h3>
          <p>קבעו שעה להדלקת הדוד או המזגן, והשרת יטפל בשאר, גם כשהאפליקציה סגורה.</p>
          <button type="button" className="btn" onClick={onAdd}>
            <Plus size={18} /> תזמון חדש
          </button>
        </div>
      ) : (
        <ul className="group">
          {sorted.map((a) => {
            const enabled = a.enabled !== false;
            const turningOn = a.action === 'turn_on';
            return (
              <li key={a.id} className={`arow ${enabled ? '' : 'disabled'}`}>
                <span className="time">{a.time}</span>
                <div>
                  <div className="atitle">{a.title}</div>
                  <div className="ameta">
                    <span className={`badge ${turningOn ? 'on' : ''}`}>{turningOn ? 'הדלקה' : 'כיבוי'}</span>
                    <span>{a.deviceName || 'מכשיר'}</span>
                    <span>{describeDays(a.days)}</span>
                    {a.type === 'ac' && turningOn && a.temp != null && (
                      <span>{(MODES.find((m) => m.value === a.mode) || MODES[0]).label} {a.temp}°</span>
                    )}
                    {turningOn && a.durationMinutes > 0 && <span>נכבה אחרי {formatDuration(a.durationMinutes)}</span>}
                  </div>
                  {a.lastError && <div className="aerror">ההרצה האחרונה נכשלה: {a.lastError}</div>}
                </div>
                <div className="acontrols">
                  <Toggle
                    checked={enabled}
                    label={enabled ? `השבתת התזמון ${a.title}` : `הפעלת התזמון ${a.title}`}
                    onChange={(next) => onToggle(a.id, next)}
                  />
                  {confirmId === a.id ? (
                    <div className="confirm">
                      <button type="button" className="yes" onClick={() => { setConfirmId(null); onRemove(a.id); }}>מחיקה</button>
                      <button type="button" onClick={() => setConfirmId(null)}>ביטול</button>
                    </div>
                  ) : (
                    <button type="button" className="trash" aria-label={`מחיקת התזמון ${a.title}`} onClick={() => setConfirmId(a.id)}>
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

