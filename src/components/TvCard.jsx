import { useState } from 'react';
import { Power, Tv } from 'lucide-react';
import { api } from '../api';
import { deviceId, deviceName } from '../lib/devices';

export default function TvCard({ device, toast }) {
  const [busy, setBusy] = useState(false);
  const unavailable = !device.online || !device.infraredId;

  const press = async () => {
    setBusy(true);
    try {
      await api.sendTvPower(device.infraredId, deviceId(device), device.remote_index);
      toast('נשלחה פקודת הדלקה או כיבוי');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`row-card ${unavailable ? 'offline' : ''}`} aria-label={deviceName(device)}>
      <div className="card-icon"><Tv size={22} /></div>
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
        aria-label="הדלקה או כיבוי של הטלוויזיה"
        disabled={unavailable || busy}
        onClick={press}
      >
        <Power size={21} />
      </button>
    </section>
  );
}
