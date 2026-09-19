import React, { useState, useEffect } from 'react';
import { Tv, AirVent, Power, RefreshCw, Wifi, WifiOff, Thermometer, Plus, Minus } from 'lucide-react';

const API_BASE_URL = 'https://tuya-backend-irpd.onrender.com/api';

export default function App() {
  const [devices, setDevices] = useState([]);
  const [endpoints, setEndpoints] = useState([]); // רשימה מאוחדת של ציוד קצה (מכשירים רגילים + שלטי IR)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [acParams, setAcParams] = useState({
    temp: 24,
    mode: 1,   // 1: קירור, 4: חימום, 0: אוטומטי, 2: ייבוש, 3: מאוורר
    wind: 0,   // 0: אוטומטי, 1: נמוך, 2: בינוני, 3: גבוה
  });
  
  const [actionLoading, setActionLoading] = useState({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/devices`);
      const data = await res.json();
      
      if (data.success) {
        const fetchedDevices = data.devices || [];
        setDevices(fetchedDevices);

        let allEndpoints = [];

        for (const device of fetchedDevices) {
          if (device.category === 'wnykq') {
            // אם זו רכזת IR - נמשוך את השלטים שלה ונציג *אותם* במקום את הרכזת עצמה
            try {
              const irRes = await fetch(`${API_BASE_URL}/ir/${device.id}/remotes`);
              const irData = await irRes.json();
              if (irData.success && irData.remotes) {
                const remotesAsEndpoints = irData.remotes.map(remote => ({
                  ...remote,
                  isVirtualIr: true,
                  infraredId: device.id, // שומרים את מזהה הרכזת לצורך שליחת פקודות
                  online: device.online,
                }));
                allEndpoints.push(...remotesAsEndpoints);
              }
            } catch (e) {
              console.error('Failed to fetch remotes for hub', device.id, e);
            }
          } else {
            // מכשיר רגיל (מתג, שקע וכדומה)
            allEndpoints.push({
              ...device,
              isVirtualIr: false,
            });
          }
        }

        setEndpoints(allEndpoints);
      } else {
        setError(data.error || 'שגיאה במשיכת הנתונים');
      }
    } catch (err) {
      setError('לא ניתן להתחבר לשרת ה-Backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // שליחת פקודה למכשיר רגיל
  const sendDeviceCommand = async (deviceId, code, value) => {
    const key = `${deviceId}-${code}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: [{ code, value }] }),
      });
      const data = await response.json();
      if (!data.success) alert(`שגיאה: ${data.error}`);
    } catch (err) {
      alert('שגיאה בתקשורת');
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // שליחת פקודה לשלט IR (מזגן)
  const sendAcCommand = async (infraredId, remoteId, code, value) => {
    const key = `${remoteId}-${code}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const response = await fetch(`${API_BASE_URL}/ir/${infraredId}/remotes/${remoteId}/ac-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, value }),
      });

      const data = await response.json();
      if (!data.success) {
        alert(`❌ שגיאה מהשרת: ${data.error}`);
      }
    } catch (err) {
      alert('שגיאה בתקשורת עם השרת');
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleTempChange = (infraredId, remoteId, delta) => {
    const newTemp = Math.min(30, Math.max(16, acParams.temp + delta));
    setAcParams((prev) => ({ ...prev, temp: newTemp }));
    sendAcCommand(infraredId, remoteId, 'temp', newTemp);
  };

  const handleModeChange = (infraredId, remoteId, newMode) => {
    const modeNum = Number(newMode);
    setAcParams((prev) => ({ ...prev, mode: modeNum }));
    sendAcCommand(infraredId, remoteId, 'mode', modeNum);
  };

  const handleWindChange = (infraredId, remoteId, newWind) => {
    const windNum = Number(newWind);
    setAcParams((prev) => ({ ...prev, wind: windNum }));
    sendAcCommand(infraredId, remoteId, 'wind', windNum);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px', maxWidth: '650px', margin: '0 auto', direction: 'rtl' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Smart Home Control</h1>
        <button 
          onClick={fetchData} 
          disabled={loading}
          style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #ccc', background: '#f5f5f5' }}
        >
          <RefreshCw className={loading ? 'spin' : ''} size={18} />
        </button>
      </header>

      {loading && <p>טוען ציוד קצה...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {endpoints.map((item) => {
            // אם זה שלט מזגן וירטואלי
            if (item.isVirtualIr) {
              const isAc = item.category_id === '5' || item.brand_name === 'Tadiran';

              return (
                <div key={item.remote_id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isAc ? <AirVent size={22} color="#2563eb" /> : <Tv size={22} color="#9333ea" />}
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{item.remote_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>מותג: {item.brand_name}</div>
                      </div>
                    </div>
                    <div>
                      {item.online ? (
                        <span style={{ color: 'green', fontSize: '0.85rem' }}><Wifi size={14} style={{display:'inline', verticalAlign:'middle'}}/> מחובר</span>
                      ) : (
                        <span style={{ color: 'gray', fontSize: '0.85rem' }}><WifiOff size={14} style={{display:'inline', verticalAlign:'middle'}}/> לא מחובר</span>
                      )}
                    </div>
                  </div>

                  {/* בקרת מזגן */}
                  {isAc && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      
                      {/* טמפרטורה */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                          <Thermometer size={18} color="#2563eb" />
                          <span>טמפרטורה: {acParams.temp}°C</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleTempChange(item.infraredId, item.remote_id, -1)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f1f5f9', cursor: 'pointer' }}><Minus size={14} /></button>
                          <button onClick={() => handleTempChange(item.infraredId, item.remote_id, 1)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f1f5f9', cursor: 'pointer' }}><Plus size={14} /></button>
                        </div>
                      </div>

                      {/* מצב ועוצמת מאוורר */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>מצב עבודה:</label>
                          <select 
                            value={acParams.mode} 
                            onChange={(e) => handleModeChange(item.infraredId, item.remote_id, e.target.value)}
                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem' }}
                          >
                            <option value="1">קירור (Cool)</option>
                            <option value="4">חימום (Heat)</option>
                            <option value="0">אוטומטי (Auto)</option>
                            <option value="2">ייבוש (Dry)</option>
                            <option value="3">מאוורר (Fan)</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>עוצמת מאוורר:</label>
                          <select 
                            value={acParams.wind} 
                            onChange={(e) => handleWindChange(item.infraredId, item.remote_id, e.target.value)}
                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem' }}
                          >
                            <option value="0">אוטומטי (Auto)</option>
                            <option value="1">נמוך (Low)</option>
                            <option value="2">בינוני (Mid)</option>
                            <option value="3">גבוה (High)</option>
                          </select>
                        </div>
                      </div>

                      {/* כפתורי הדלקה / כיבוי */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button onClick={() => sendAcCommand(item.infraredId, item.remote_id, 'power', 1)} style={{ flex: 1, backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>הדלק מזגן</button>
                        <button onClick={() => sendAcCommand(item.infraredId, item.remote_id, 'power', 0)} style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>כבה מזגן</button>
                      </div>

                    </div>
                  )}
                </div>
              );
            }

            // מכשיר רגיל (אם קיים ברשת)
            return (
              <div key={item.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Power size={20} color="#64748b" />
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>קטגוריה: {item.category}</div>
                  </div>
                </div>
                <div>
                  {item.online ? <span style={{ color: 'green' }}>מחובר</span> : <span style={{ color: 'gray' }}>לא מחובר</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}