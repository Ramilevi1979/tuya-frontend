import React, { useState, useEffect } from 'react';

const API_BASE = 'https://tuya-backend-irpd.onrender.com';

export default function App() {
  const [activeTab, setActiveTab] = useState('devices');
  const [devices, setDevices] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // מצבי שליטה למזגנים בלייב (לפי מזהה מכשיר)
  const [acState, setAcState] = useState({});

  // טופס אוטומציות
  const [formData, setFormData] = useState({
    title: '',
    type: 'switch',
    deviceId: '',
    infraredId: '',
    action: 'turn_on',
    time: '08:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    durationMinutes: 0
  });

  const daysOfWeekNames = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\''];
  const fullDaysNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  useEffect(() => {
    fetchDevices();
    fetchAutomations();
    fetchLogs();

    const logInterval = setInterval(fetchLogs, 10000);
    return () => clearInterval(logInterval);
  }, []);

  const showStatus = (text, type = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 4000);
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/devices`);
      const data = await res.json();
      if (data.success) {
        const fetchedDevices = data.devices || [];
        setDevices(fetchedDevices);

        // אתחול מצבי מזגנים בדיפולט
        const initialAc = {};
        fetchedDevices.forEach(dev => {
          if (isACDevice(dev)) {
            initialAc[dev.id] = {
              power: true,
              temp: 24,
              mode: 'cool', // cool, heat, fan, dry, auto
              wind: 'auto'  // low, medium, high, auto
            };
          }
        });
        setAcState(prev => ({ ...initialAc, ...prev }));
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  const fetchAutomations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/automations`);
      const data = await res.json();
      if (data.success) setAutomations(data.automations || []);
    } catch (err) {
      console.error('Error fetching automations:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/logs`);
      const data = await res.json();
      if (data.success) setLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  // זיהוי סוג מכשיר לפי שם או סוג
  const isACDevice = (dev) => {
    const name = (dev.name || '').toLowerCase();
    const category = (dev.category || '').toLowerCase();
    return name.includes('מזגן') || name.includes('ac') || category.includes('kt') || category.includes('ac');
  };

  const isTVDevice = (dev) => {
    const name = (dev.name || '').toLowerCase();
    return name.includes('tv') || name.includes('טלוויזיה') || name.includes('טלוויזיה');
  };

  // שליחת פקודת מתג רגיל
  const handleDeviceCommand = async (deviceId, code, value, deviceName) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/devices/${deviceId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: [{ code, value }], deviceName })
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`פקודה נשלחה בהצלחה ל-${deviceName || deviceId}`);
      } else {
        showStatus(`שגיאה: ${data.error || 'נכשלה שליחת הפקודה'}`, 'error');
      }
    } catch (err) {
      showStatus(`שגיאה בתקשורת: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      fetchLogs();
    }
  };

  // שליחת פקודת מזגן מורכבת (IR / Tuya AC)
  const handleAcCommand = async (dev, customPowerState = null) => {
    setLoading(true);
    const current = acState[dev.id] || { power: true, temp: 24, mode: 'cool', wind: 'auto' };
    const powerValue = customPowerState !== null ? customPowerState : current.power;

    // ביוplace של פקודות מזגן תקניות ב-Tuya
    const commands = [
      { code: 'power', value: powerValue },
      { code: 'switch', value: powerValue },
      { code: 'temp', value: current.temp },
      { code: 'mode', value: current.mode },
      { code: 'wind', value: current.wind }
    ];

    try {
      const res = await fetch(`${API_BASE}/api/devices/${dev.id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands,
          deviceName: dev.name,
          isAc: true,
          acPayload: {
            power: powerValue ? 1 : 0,
            temperature: current.temp,
            mode: current.mode,
            wind: current.wind
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`פקודת מזגן נשלחה בהצלחה ל-${dev.name}`);
      } else {
        showStatus(`שגיאה בהפעלת מזגן: ${data.error || 'ללא תגובה'}`, 'error');
      }
    } catch (err) {
      showStatus(`שגיאה בתקשורת: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      fetchLogs();
    }
  };

  // עדכון טמפרטורה/מצב במדינה המקומית
  const updateAcLocal = (deviceId, key, val) => {
    setAcState(prev => ({
      ...prev,
      [deviceId]: {
        ...(prev[deviceId] || { power: true, temp: 24, mode: 'cool', wind: 'auto' }),
        [key]: val
      }
    }));
  };

  const handleCreateAutomation = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.deviceId || !formData.time) {
      showStatus('נא למלא את כל שדות החובה', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showStatus('האוטומציה נוצרה בהצלחה!');
        fetchAutomations();
        setFormData({
          title: '',
          type: 'switch',
          deviceId: '',
          infraredId: '',
          action: 'turn_on',
          time: '08:00',
          days: [0, 1, 2, 3, 4, 5, 6],
          durationMinutes: 0
        });
      } else {
        showStatus(`שגיאה: ${data.error}`, 'error');
      }
    } catch (err) {
      showStatus(`שגיאה ביצירת אוטומציה: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAutomation = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/automations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showStatus('האוטומציה נמחקה');
        fetchAutomations();
      }
    } catch (err) {
      showStatus('שגיאה במחיקת אוטומציה', 'error');
    }
  };

  const toggleDay = (dayIdx) => {
    if (formData.days.includes(dayIdx)) {
      setFormData({ ...formData, days: formData.days.filter(d => d !== dayIdx) });
    } else {
      setFormData({ ...formData, days: [...formData.days, dayIdx].sort() });
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* כותרת וטאבים */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              🏠 מרכז שליטה ואוטומציות Tuya
            </h1>
            <p className="text-sm text-slate-500 mt-1">ניהול מכשירים, שלטי מזגן, תזמון מראש ומעקב אירועים</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('devices')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'devices' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              ⚡ מכשירים ({devices.length})
            </button>
            <button 
              onClick={() => setActiveTab('automations')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'automations' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              📅 אוטומציות ({automations.length})
            </button>
            <button 
              onClick={() => setActiveTab('logs')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              📜 לוג אירועים ({logs.length})
            </button>
          </div>
        </header>

        {statusMsg.text && (
          <div className={`p-4 rounded-xl text-sm font-semibold text-center transition-all ${statusMsg.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
            {statusMsg.text}
          </div>
        )}

        {/* טאב מכשירים */}
        {activeTab === 'devices' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">⚡ רשימת מכשירים ושלטים משוייכים</h2>
              <button 
                onClick={fetchDevices} 
                className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg transition"
              >
                🔄 רענן מכשירים
              </button>
            </div>

            {devices.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400">
                לא נתקבלו מכשירים מהענן של Tuya
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {devices.map((dev) => {
                  const isAC = isACDevice(dev);
                  const isTV = isTVDevice(dev);
                  const ac = acState[dev.id] || { power: true, temp: 24, mode: 'cool', wind: 'auto' };

                  return (
                    <div key={dev.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                      
                      {/* כותרת מכשיר */}
                      <div className="flex justify-between items-start border-b pb-3">
                        <div>
                          <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                            {isAC ? '❄️' : isTV ? '📺' : '🔌'} {dev.name || 'מכשיר ללא שם'}
                          </h3>
                          <p className="text-xs text-slate-400">ID: {dev.id}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${dev.online ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                          {dev.online ? 'מחובר' : 'לא מחובר'}
                        </span>
                      </div>

                      {/* --- מקרה 1: בקרת מזגן מלאה --- */}
                      {isAC ? (
                        <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700">❄️ בקרת מזגן מתקדמת</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">
                              {ac.temp}°C
                            </span>
                          </div>

                          {/* שליטה בטמפרטורה */}
                          <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border">
                            <span className="text-xs font-semibold text-slate-600">טמפרטורה:</span>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => updateAcLocal(dev.id, 'temp', Math.max(16, ac.temp - 1))}
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-lg flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className="font-extrabold text-lg text-slate-900 w-10 text-center">{ac.temp}°C</span>
                              <button 
                                onClick={() => updateAcLocal(dev.id, 'temp', Math.min(30, ac.temp + 1))}
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-lg flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* בורר מצבי עבודה */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">מצב עבודה:</label>
                            <div className="grid grid-cols-3 gap-1 text-xs">
                              {[
                                { id: 'cool', label: '❄️ קירור' },
                                { id: 'heat', label: '🔥 חימום' },
                                { id: 'fan', label: '💨 אוורור' },
                                { id: 'dry', label: '💧 ייבוש' },
                                { id: 'auto', label: '🤖 אוטומטי' }
                              ].map(m => (
                                <button
                                  key={m.id}
                                  onClick={() => updateAcLocal(dev.id, 'mode', m.id)}
                                  className={`p-1.5 rounded-lg border font-medium transition ${ac.mode === m.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* כפתורי הפעלה וכיבוי למזגן */}
                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={() => {
                                updateAcLocal(dev.id, 'power', true);
                                handleAcCommand(dev, true);
                              }}
                              disabled={loading}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                            >
                              הדלק מזגן
                            </button>
                            <button 
                              onClick={() => {
                                updateAcLocal(dev.id, 'power', false);
                                handleAcCommand(dev, false);
                              }}
                              disabled={loading}
                              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                            >
                              כבה מזגן
                            </button>
                          </div>
                        </div>
                      ) : isTV ? (
                        /* --- מקרה 2: שליטה בטלוויזיה / IR TV --- */
                        <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                          <span className="text-xs font-bold text-slate-700 block mb-2">📺 שלט טלוויזיה</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => handleDeviceCommand(dev.id, 'power', true, dev.name)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold"
                            >
                              הפעל / כבה
                            </button>
                            <button 
                              onClick={() => handleDeviceCommand(dev.id, 'mute', true, dev.name)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-800 py-2 rounded-xl text-xs font-bold"
                            >
                              השתק (Mute)
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* --- מקרה 3: מתג / דוד / שקע חכם --- */
                        <div className="flex gap-2 pt-1">
                          <button 
                            onClick={() => handleDeviceCommand(dev.id, 'switch_1', true, dev.name)}
                            disabled={loading}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-50"
                          >
                            הדלק מתג
                          </button>
                          <button 
                            onClick={() => handleDeviceCommand(dev.id, 'switch_1', false, dev.name)}
                            disabled={loading}
                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-50"
                          >
                            כבה מתג
                          </button>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* טאב אוטומציות */}
        {activeTab === 'automations' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b pb-3">➕ יצירת תזמון/אוטומציה חדשה</h2>
              <form onSubmit={handleCreateAutomation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">שם האוטומציה *</label>
                  <input 
                    type="text" 
                    placeholder="למשל: הדלקת מזגן סלון בבוקר" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">סוג המכשיר</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="switch">מתג / דוד / שקע חכם</option>
                    <option value="ac">❄️ מזגן (שלט IR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">מזהה מכשיר (Device ID) *</label>
                  <input 
                    type="text" 
                    placeholder="הכנס Device ID" 
                    value={formData.deviceId} 
                    onChange={e => setFormData({...formData, deviceId: e.target.value})} 
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">פעולה לבדיקה</label>
                  <select 
                    value={formData.action} 
                    onChange={e => setFormData({...formData, action: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="turn_on">הדלקה (Turn On)</option>
                    <option value="turn_off">כיבוי (Turn Off)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">שעת הפעלה (HH:mm) *</label>
                  <input 
                    type="time" 
                    value={formData.time} 
                    onChange={e => setFormData({...formData, time: e.target.value})} 
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">משך הפעלה בדקות (כיבוי אוטומטי)</label>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="0 = ללא כיבוי אוטומטי" 
                    value={formData.durationMinutes} 
                    onChange={e => setFormData({...formData, durationMinutes: e.target.value})} 
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-600">ימים פעילים בשבוע</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {daysOfWeekNames.map((name, idx) => {
                      const isSelected = formData.days.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleDay(idx)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-2 pt-2">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    {loading ? 'שומר...' : 'שמור תזמון חדש'}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">📅 לוח תזמונים פעילים</h2>
              
              {automations.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400">
                  אין אוטומציות מוגדרות במערכת
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {automations.map((auto) => (
                    <div key={auto.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                      <div className="flex justify-between items-start border-b pb-3">
                        <h3 className="font-bold text-slate-900 text-lg">{auto.title}</h3>
                        <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-full">
                          {auto.type === 'ac' ? '❄️ מזגן (IR)' : '⚡ מתג'}
                        </span>
                      </div>
                      <div className="text-sm space-y-1 text-slate-600">
                        <p>🕒 <b>שעה:</b> {auto.time}</p>
                        <p>⏳ <b>כיבוי אוטומטי:</b> {auto.durationMinutes > 0 ? `${auto.durationMinutes} דק'` : 'ללא'}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteAutomation(auto.id)}
                        className="w-full text-xs text-red-600 hover:text-red-700 bg-red-50 py-2 rounded-xl transition font-medium"
                      >
                        מחק תזמון
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* טאב לוגים */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">📜 לוג אירועים בזמן אמת</h2>
              <button onClick={fetchLogs} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl">
                🔄 רענן
              </button>
            </div>

            <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 text-xs">
                  <tr>
                    <th className="p-3">זמן</th>
                    <th className="p-3">מקור</th>
                    <th className="p-3">מכשיר</th>
                    <th className="p-3">פעולה</th>
                    <th className="p-3">סטטוס</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-400">אין אירועים בלוג</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-3 text-xs text-slate-500">{log.timestamp}</td>
                        <td className="p-3 text-xs">{log.source}</td>
                        <td className="p-3 font-semibold text-slate-800">{log.title}</td>
                        <td className="p-3 text-xs">{log.action}</td>
                        <td className="p-3 text-xs font-bold">
                          {log.status === 'success' ? <span className="text-emerald-600">✓ הצליח</span> : <span className="text-rose-600">✗ נכשל</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
