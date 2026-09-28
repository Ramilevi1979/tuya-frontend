import { useEffect, useState } from 'react';
import { AlertCircle, CalendarClock, Hand } from 'lucide-react';
import { api } from '../api';
import { Sheet } from './ui';

const pad = (n) => String(n).padStart(2, '0');

function formatWhen(iso) {
  const d = new Date(iso);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return time;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `אתמול ${time}`;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${time}`;
}

export default function LogSheet({ onClose, toast }) {
  const [entries, setEntries] = useState(null); // null = loading
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.getLog().then((list) => { if (alive) setEntries(list); }).catch((err) => {
      if (alive) setError(err.message);
    });
    return () => { alive = false; };
  }, []);

  return (
    <Sheet title="יומן פעילות" onClose={onClose}>
      {entries === null && !error && <div className="skeleton" style={{ height: 220 }} />}
      {error && (
        <div className="notice error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {entries && entries.length === 0 && (
        <div className="empty" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
          <h3>אין עדיין פעילות</h3>
          <p>פעולות ידניות ותזמונים שרצו יופיעו כאן.</p>
        </div>
      )}
      {entries && entries.length > 0 && (
        <ul className="group log-group">
          {entries.map((e) => (
            <li key={e.id} className={`logrow ${e.status === 'error' ? 'error' : ''}`}>
              <span className="logicon" aria-hidden="true">
                {e.source === 'schedule' ? <CalendarClock size={17} /> : <Hand size={17} />}
              </span>
              <div>
                <div className="logtitle">{e.deviceName || 'מכשיר'}</div>
                <div className="logmeta">
                  <span>{e.detail}</span>
                  {e.source === 'schedule' && e.automationTitle && <span>מתוך: {e.automationTitle}</span>}
                  {e.status === 'error' && <span>נכשל{e.error ? `: ${e.error}` : ''}</span>}
                </div>
              </div>
              <span className="logwhen">{formatWhen(e.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
