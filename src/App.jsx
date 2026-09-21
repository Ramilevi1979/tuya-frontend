import React, { useState, useEffect } from 'react';
import { Tv, AirVent, Power, RefreshCw, Wifi, WifiOff, Thermometer, Plus, Minus, Lock, LogOut, Clock, Calendar, Trash2 } from 'lucide-react';

const API_BASE_URL = 'https://tuya-backend-irpd.onrender.com/api';
const GOOGLE_CLIENT_ID = '339873617760-a6clnch30qndp1qccv2bhr94d7e79br3.apps.googleusercontent.com';
const ALLOW_EMAIL = 'rami.levi1979@gmail.com';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('devices'); 
  const [devices, setDevices] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [newAuto, setNewAuto] = useState({
    title: 'הפעלת מכשיר',
    deviceId: '',
    code: 'switch_1',
    value: true,
    time: '07:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    durationMinutes: 45 
  });

  const [acParams, setAcParams] = useState({
    temp: 24,
    mode: 1,
    wind: 0,
  });

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
        fetchAutomations();
      } else {
        alert(`גישה נדחתה לחשבון: ${payload.email}`);
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

  const fetchAutomations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/automations`);
      const data = await res.json();
      if (data.success) {
        setAutomations(data.automations || []);
      }
    } catch (e) {
      console.error('Failed to fetch automations', e);
    }
  };

  const createAutomation = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAuto),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ האוטומציה נוצרה בהצלחה!');
        fetchAutomations();
      } else {
        alert(`❌ שגיאה: ${data.error}`);
      }
    } catch (err) {
      alert('שגיאה בתקשורת עם השרת');
    }
  };

  const deleteAutomation = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/automations/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchAutomations();
      }
    } catch (err) {
      alert('שגיאה במחיקת האוטומציה');
    }
  };

  const sendDeviceCommand = async (deviceId, code, value) => {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: [{ code, value }] }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(`❌ שגיאה מהשרת: ${data.error || JSON.stringify(data)}`);
      } else {
        fetchData();
      }
    } catch (err) {
      alert('שגיאה בתקשורת עם השרת');
    }
  };

  const sendAcCommand = async (infraredId, remoteId, code, value) => {
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', margin: 0, color: '#1e293b' }}>Smart Home Control</h1>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>שלום, {user.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { fetchData(); fetchAutomations(); }} disabled={loading} style={{ padding: '8px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={handleLogout} title="התנתק" style={{ padding: '8px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#ef4444' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          onClick={() => setActiveTab('devices')}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: activeTab === 'devices' ? '#2563eb' : '#e2e8f0', color: activeTab === 'devices' ? '#fff' : '#334155', fontWeight: 'bold', cursor: 'pointer' }}
        >
          מכשירים ושליטה
        </button>
        <button 
          onClick={() => setActiveTab('automations')}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: activeTab === 'automations' ? '#2563eb' : '#e2e8f0', color: activeTab === 'automations' ? '#fff' : '#334155', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ⏰ אוטומציות וטיימרים
        </button>
      </div>

      {activeTab === 'devices' ? (
        <div>
          {loading && <p>טוען ציוד קצה...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {!loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {endpoints.map((item) => {
                if (item.isVirtualIr) {
                  const isAc = item.category_id === '5' || item.brand_name === 'Tadiran';

                  return (
                    <div key={item.remote_id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {isAc ? <AirVent size={22} color="#2563eb" /> : <Tv size={22} color="#9333ea" />}
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{item.remote_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>מותג: {item.brand_name}</div>
                          </div>
                        </div>
                        <span style={{ color: item.online ? 'green' : 'gray', fontSize: '0.85rem' }}>{item.online ? 'מחובר' : 'לא מחובר'}</span>
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
                  const statuses = item.status || [];
                  return (
                    <div key={item.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Power size={22} color="#0284c7" />
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>קטגוריה: {item.category}</div>
                          </div>
                        </div>
                        <span style={{ color: item.online ? 'green' : 'gray', fontSize: '0.85rem' }}>{item.online ? 'מחובר' : 'לא מחובר'}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        {statuses.length === 0 ? (
                          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>אין נתוני סטטוס זמינים למכשיר זה</p>
                        ) : (
                          statuses.map((st) => {
                            if (!st.code.includes('switch')) return null;
                            return (
                              <div key={st.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#334155' }}>
                                  {st.code}: {st.value ? '🟢 דלוק' : '🔴 כבוי'}
                                </span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button onClick={() => sendDeviceCommand(item.id, st.code, true)} style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>הדלק</button>
                                  <button onClick={() => sendDeviceCommand(item.id, st.code, false)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>כבה</button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <form onSubmit={createAutomation} style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>➕ הוסף תזמון / טיימר אוטומטי</h3>
            
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>שם האוטומציה:</label>
              <input 
                type="text" 
                value={newAuto.title} 
                onChange={(e) => setNewAuto({...newAuto, title: e.target.value})} 
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>בחר מכשיר להפעלה:</label>
              <select 
                value={newAuto.deviceId} 
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const dev = devices.find(d => d.id === selectedId);
                  const defaultCode = dev?.status?.find(s => s.code.includes('switch'))?.code || 'switch_1';
                  setNewAuto({...newAuto, deviceId: selectedId, code: defaultCode});
                }}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', background: '#fff' }}
              >
                <option value="">בחר מכשיר מהרשימה</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.category})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>קוד פקודה (Code):</label>
              <input 
                type="text" 
                value={newAuto.code} 
                onChange={(e) => setNewAuto({...newAuto, code: e.target.value})} 
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', background: '#f8fafc' }}
                placeholder="למשל: switch_1 או switch"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>שעה להפעלה:</label>
                <input 
                  type="time" 
                  value={newAuto.time} 
                  onChange={(e) => setNewAuto({...newAuto, time: e.target.value})} 
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>כיבוי אוטומטי אחרי (דקות):</label>
                <input 
                  type="number" 
                  value={newAuto.durationMinutes} 
                  onChange={(e) => setNewAuto({...newAuto, durationMinutes: Number(e.target.value)})} 
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                />
              </div>
            </div>

            <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
              שמור אוטומציה חדשה
            </button>
          </form>

          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1e293b' }}>📋 תזמונים פעילים</h3>
            {automations.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>אין עדיין אוטומציות מוגדרות.</p>
            ) : (
              automations.map(aut => (
                <div key={aut.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{aut.title} ({aut.code})</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>שעה: {aut.time} | כיבוי אוטומטי: {aut.durationMinutes} דקות</div>
                  </div>
                  <button onClick={() => deleteAutomation(aut.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
