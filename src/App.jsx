import React, { useState, useEffect } from 'react';
import { Tv, AirVent, Power, RefreshCw, Wifi, WifiOff, Thermometer, Plus, Minus, Lock, LogOut, ToggleLeft, ToggleRight } from 'lucide-react';

const API_BASE_URL = 'https://tuya-backend-irpd.onrender.com/api';
const GOOGLE_CLIENT_ID = '339873617760-a6clnch30qndp1qccv2bhr94d7e79br3.apps.googleusercontent.com';
const ALLOW_EMAIL = 'rami.levi1979@gmail.com';

export default function App() {
  const [user, setUser] = useState(null);
  const [devices, setDevices] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [acParams, setAcParams] = useState({
    temp: 24,
    mode: 1,
    wind: 0,
  });
  
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('googleButtonDiv'),
        { theme: 'outline', size: 'large', width: '100%' }
      );
    }
  }, [user]);

  const handleCredentialResponse = (response) => {
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      if (payload.email === ALLOW_EMAIL) {
        setUser({ name: payload.name, email: payload.email });
        fetchData();
      } else {
        alert(`גישה נדחתה לחשבון: ${payload.email}. המערכת מוגדרת למשתמש מורשה בלבד.`);
      }
    } catch (e) {
      console.error('Failed to parse Google token', e);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setEndpoints([]);
  };

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
            try {
              const irRes = await fetch(`${API_BASE_URL}/ir/${device.id}/remotes`);
              const irData = await irRes.json();
              if (irData.success && irData.remotes) {
                const remotesAsEndpoints = irData.remotes.map(remote => ({
                  ...remote,
                  isVirtualIr: true,
                  infraredId: device.id,
                  online: device.online,
                }));
                allEndpoints.push(...remotesAsEndpoints);
              }
            } catch (e) {
              console.error('Failed to fetch remotes for hub', device.id, e);
            }
          } else {
            // מכשיר רגיל (כמו מתג חכם של דוד, תאורה וכו')
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

  const sendDeviceCommand = async (deviceId, code, value) => {
    const key = `${deviceId}-${code}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, value }),
      });

      const data = await response.json();
      if (!data.success) {
        alert(`❌ שגיאה מהשרת: ${data.error}`);
      } else {
        fetchData(); // רענון נתונים לאחר הפקודה
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

  if (!user) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', direction: 'rtl', padding: '20px' }}>
        <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '400px', width: '100%', border: '1px solid #e2e8f0' }}>
          <div style={{ background: '#eff6ff', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock size={28} color="#2563eb" />
          </div>
          <h1 style={{ fontSize: '1.3rem', marginBottom: '8px', color: '#1e293b' }}>אזור מאובטח - בית חכם</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '24px' }}>הגישה מותרת למשתמש מורשה בלבד באמצעות חשבון Google.</p>
          
          <div id="googleButtonDiv" style={{ display: 'flex', justifyContent: 'center' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px', maxWidth: '650px', margin: '0 auto', direction: 'rtl' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', margin: 0, color: '#1e293b' }}>Smart Home Control</h1>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>שלום, {user.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchData} disabled={loading} style={{ padding: '8px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>
            <RefreshCw className={loading ? 'spin' : ''} size={16} />
          </button>
          <button onClick={handleLogout} title="התנתק" style={{ padding: '8px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#ef4444' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {loading && <p>טוען ציוד קצה...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {endpoints.map((item) => {
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

                  {isAc && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
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

                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button onClick={() => sendAcCommand(item.infraredId, item.remote_id, 'power', 1)} style={{ flex: 1, backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>הדלק מזגן</button>
                        <button onClick={() => sendAcCommand(item.infraredId, item.remote_id, 'power', 0)} style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>כבה מזגן</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            } else {
              // הצגת מתג חכם / דוד שמש / מכשיר רגיל
              const isOn = item.status && item.status.some(s => s.code.startsWith('switch') && s.value === true);
              const switchCode = item.status && item.status.find(s => s.code.startsWith('switch'))?.code || 'switch_1';

              return (
                <div key={item.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Power size={22} color={isOn ? '#22c55e' : '#64748b'} />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>קטגוריה: {item.category}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.online ? (
                      <span style={{ color: 'green', fontSize: '0.8rem' }}><Wifi size={14} style={{display:'inline', verticalAlign:'middle'}}/></span>
                    ) : (
                      <span style={{ color: 'gray', fontSize: '0.8rem' }}><WifiOff size={14} style={{display:'inline', verticalAlign:'middle'}}/></span>
                    )}
                    <button 
                      onClick={() => sendDeviceCommand(item.id, switchCode, !isOn)}
                      style={{ 
                        padding: '8px 16px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        backgroundColor: isOn ? '#ef4444' : '#22c55e', 
                        color: '#fff', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {isOn ? 'כיבוי' : 'הדלקה'}
                    </button>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
