import { RefreshCw, WifiOff } from 'lucide-react';
import { groupDevices } from '../lib/devices';
import AcCard from './AcCard';
import TvCard from './TvCard';
import SwitchTiles from './SwitchTiles';

export default function DevicesView({ devices, phase, error, slow, onRetry, onToggle, toast }) {
  if (phase === 'loading') {
    return (
      <div className="stack">
        {slow && (
          <div className="notice" role="status">
            <RefreshCw size={18} />
            השרת מתעורר, זה יכול לקחת עד דקה
          </div>
        )}
        <div className="skeleton" style={{ height: 380 }} />
        <div className="skeleton" style={{ height: 76 }} />
        <div className="skeleton" style={{ height: 116 }} />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="notice error" role="alert">
        <WifiOff size={18} />
        {error}
        <button type="button" className="btn small quiet" onClick={() => onRetry({ silent: false, force: true })}>
          נסו שוב
        </button>
      </div>
    );
  }

  const groups = groupDevices(devices);
  if (!groups.ac.length && !groups.tv.length && !groups.switch.length) {
    return (
      <div className="empty">
        <h3>לא נמצאו מכשירים</h3>
        <p>ודאו שהמכשירים מחוברים לחשבון Tuya, ואז רעננו.</p>
      </div>
    );
  }

  return (
    <div>
      {groups.ac.length > 0 && (
        <>
          <h2 className="section-title">מזגנים</h2>
          <div className="stack">
            {groups.ac.map((d) => <AcCard key={d.id || d.remote_id} device={d} toast={toast} />)}
          </div>
        </>
      )}
      {groups.tv.length > 0 && (
        <>
          <h2 className="section-title">טלוויזיות</h2>
          <div className="stack">
            {groups.tv.map((d) => <TvCard key={d.id || d.remote_id} device={d} toast={toast} />)}
          </div>
        </>
      )}
      {groups.switch.length > 0 && (
        <>
          <h2 className="section-title">מתגים ושקעים</h2>
          <SwitchTiles devices={groups.switch} onToggle={onToggle} />
        </>
      )}
    </div>
  );
}
