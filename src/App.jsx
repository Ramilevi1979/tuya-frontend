import React, { useState, useEffect } from 'react';

const API_BASE = ''; 

export default function App() {
  const [activeTab, setActiveTab] = useState('automations');
  const [devices, setDevices] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

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
      if (data.success) setDevices(data.devices || []);
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

  const handleClearLogs = async () => {
    try {
      await fetch(`${API_BASE}/api/logs`, { method: 'DELETE' });
      setLogs([]);
      showStatus('הלוגים נוקו בהצלחה');
    } catch (err) {
      showStatus('שגיאה בניקוי הלוגים', 'error');
    }
  };

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
        showStatus(`שגיאה: ${data.error}`, 'error');
      }
    } catch (err) {
      showStatus(`שגיאה בתקשורת: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      fetchLogs();
    }
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

  const getNextRunForecast = (auto) => {
    if (!auto.days || auto.days.length === 0 || !auto.time) return 'לא מתוזמן';

    const [targetHour, targetMinute] = auto.time.split(':').map(Number);
    const now = new Date();

    for (let offset = 0; offset <= 7; offset++) {
      const testDate = new Date();
      testDate.setDate(now.getDate() + offset);
      testDate.setHours(targetHour, targetMinute, 0, 0);

      const dayOfWeek = testDate.getDay();

      if (auto.days.includes(dayOfWeek)) {
        if (testDate > now) {
          const dayName = fullDaysNames[dayOfWeek];
          const dateFormatted = testDate.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
          return `יום ${dayName} (${dateFormatted}) בשעה ${auto.time}`;
        }
      }
    }
    return 'לא נמצא תזמון קרוב';
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              🏠 מרכז שליטה ואוטומציות Tuya
            </h1>
            <p className="text-sm text-slate-500 mt-1">ניהול מכשירים, תזמון מראש ומעקב אירועים בזמן אמת</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('automations')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'automations' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              📅 אוטומציות ({automations.length})
            </button>
            <button 
              onClick={() => setActiveTab('devices')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'devices' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              ⚡ מכשירים ({devices.length})
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

        {activeTab === 'automations' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b pb-3">➕ יצירת תזמון/אוטומציה חדשה</h2>
              <form onSubmit={handleCreateAutomation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">שם האוטומציה *</label>
                  <input 
                    type="text" 
                    placeholder="למשל: הדלקת מזגן בבוקר" 
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

                {formData.type === 'ac' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">מזהה רכזת IR (Infrared ID) *</label>
                    <input 
                      type="text" 
                      placeholder="הכנס Infrared Hub ID" 
                      value={formData.infraredId} 
                      onChange={e => setFormData({...formData, infraredId: e.target.value})} 
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      required={formData.type === 'ac'}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">פעולה לבדיקה</label>
                  <select 
                    value={formData.action} 
                    onChange={e => setFormData({...formData, action: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="turn_on">הדלקה (Turn On / Power 1)</option>
                    <option value="turn_off">כיבוי (Turn Off / Power 0)</option>
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
              <h2 className="text-xl font-bold text-slate-900">📅 לוח תזמונים פעילים וצפי הפעלה מלא</h2>
              
              {automations.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400">
                  אין אוטומציות מוגדרות במערכת
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {automations.map((auto) => {
                    const nextRunText = getNextRunForecast(auto);
                    const actionText = auto.action === 'turn_on' ? 'הדלקה' : 'כיבוי';
                    const typeText = auto.type === 'ac' ? '❄️ מזגן (IR)' : '⚡ מתג / דוד';
                    const durationText = auto.durationMinutes > 0 
                      ? `${auto.durationMinutes} דקות (יכבה אוטומטית)` 
                      : 'ללא כיבוי אוטומטי';

                    return (
                      <div key={auto.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3 relative">
                        <div className="flex justify-between items-start border-b pb-3">
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg">{auto.title}</h3>
                            <span className="text-xs text-slate-400">ID: {auto.id}</span>
                          </div>
                          <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-100">
                            {typeText}
                          </span>
                        </div>

                        <div className="text-sm space-y-1.5 text-slate-600">
                          <p>🎯 <b>סוג פקודה:</b> <span className="font-semibold text-slate-800">{actionText}</span></p>
                          <p>🕒 <b>שעת הפעלה:</b> <span className="font-semibold text-slate-800">{auto.time}</span></p>
                          <p>⏳ <b>משך הפעלה:</b> <span className="font-semibold text-slate-800">{durationText}</span></p>
                          <p>📆 <b>ימים פעילים:</b> {auto.days.map(d => daysOfWeekNames[d]).join(', ')}</p>
                        </div>

                        <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl text-xs font-medium border border-emerald-100 space-y-1">
                          <p className="font-bold text-emerald-900">🚀 צפי הפעלה קרובה:</p>
                          <p className="text-sm">{nextRunText}</p>
                        </div>

                        <button 
                          onClick={() => handleDeleteAutomation(auto.id)}
                          className="w-full mt-2 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 py-2 rounded-xl transition font-medium"
                        >
                          מחק תזמון
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">⚡ רשימת מכשירים משוייכים</h2>
              <button 
                onClick={fetchDevices} 
                className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg transition"
              >
                רענן מכשירים
              </button>
            </div>

            {devices.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400">
                לא נתקבלו מכשירים מהענן של Tuya
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {devices.map((dev) => (
                  <div key={dev.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-900">{dev.name || 'מכשיר ללא שם'}</h3>
                        <p className="text-xs text-slate-400">ID: {dev.id}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dev.online ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                        {dev.online ? 'מחובר' : 'לא מחובר'}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => handleDeviceCommand(dev.id, 'switch_1', true, dev.name)}
                        disabled={loading}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-xl text-xs transition disabled:opacity-50"
                      >
                        הדלק מתג
                      </button>
                      <button 
                        onClick={() => handleDeviceCommand(dev.id, 'switch_1', false, dev.name)}
                        disabled={loading}
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 rounded-xl text-xs transition disabled:opacity-50"
                      >
                        כבה מתג
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-900">📜 לוג פעילות אירועים בזמן אמת</h2>
                <p className="text-xs text-slate-400 mt-0.5">מתעד פקודות ידניות, הפעלות מתוזמנות וכיבויים אוטומטיים</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={fetchLogs} 
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl transition"
                >
                  🔄 רענן בלייב
                </button>
                <button 
                  onClick={handleClearLogs} 
                  className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl transition font-medium"
                >
                  🗑️ נקה היסטוריה
                </button>
              </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 text-xs">
                  <tr>
                    <th className="p-3">זמן</th>
                    <th className="p-3">מקור</th>
                    <th className="p-3">שם מכשיר / תזמון</th>
                    <th className="p-3">פעולה</th>
                    <th className="p-3">סטטוס</th>
                    <th className="p-3">פרטים</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-400">אין אירועים תועדו עדיין במערכת</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-xs text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                        <td className="p-3 whitespace-nowrap">
                          {log.source === 'manual' && <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-md font-medium">ידני</span>}
                          {log.source === 'automation' && <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-md font-medium">אוטומציה</span>}
                          {log.source === 'auto_off' && <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-md font-medium">כיבוי אוטומטי</span>}
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{log.title}</td>
                        <td className="p-3 text-slate-600 text-xs">{log.action}</td>
                        <td className="p-3 whitespace-nowrap">
                          {log.status === 'success' ? (
                            <span className="px-2.5 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded-full font-bold">
                              ✓ הצליח
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 text-xs bg-rose-100 text-rose-800 rounded-full font-bold">
                              ✗ נכשל
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-slate-500">{log.details}</td>
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
