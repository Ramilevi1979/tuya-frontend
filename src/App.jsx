import React, { useState, useEffect } from 'react';

const API_BASE = 'https://tuya-backend-irpd.onrender.com';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // החלף ב-Client ID שלך

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('google_token') || '');
  const [devices, setDevices] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('automations');

  useEffect(() => {
    /* טעינת כפתור גוגל */
    if (window.google && !user) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse
      });
      window.google.accounts.id.renderButton(
        document.getElementById('googleSignInBtn'),
        { theme: 'outline', size: 'large' }
      );
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      fetchDevices();
      fetchAutomations();
      fetchLogs();
    }
  }, [token]);

  const handleGoogleResponse = (response) => {
    const idToken = response.credential;
    setToken(idToken);
    localStorage.setItem('google_token', idToken);
    setUser({ loggedIn: true });
  };

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/devices`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setDevices(data.devices || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  const fetchAutomations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/automations`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setAutomations(data.automations || []);
    } catch (err) {
      console.error('Error fetching automations:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/logs`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('google_token');
  };

  if (!token) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-100 text-center space-y-4 max-w-sm w-full">
          <h1 className="text-2xl font-bold text-slate-900">🏠 התחברות למערכת</h1>
          <p className="text-sm text-slate-500">יש להתחבר עם חשבון גוגל המורשה כדי לצפות במכשירים ובאוטומציות</p>
          <div id="googleSignInBtn" className="flex justify-center pt-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">🏠 מרכז שליטה ואוטומציות Tuya</h1>
            <p className="text-sm text-slate-500 mt-1">מחובר כמשתמש מאומת</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setActiveTab('automations')} className={`px-4 py-2 rounded-xl text-sm font-medium ${activeTab === 'automations' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>📅 אוטומציות ({automations.length})</button>
            <button onClick={() => setActiveTab('devices')} className={`px-4 py-2 rounded-xl text-sm font-medium ${activeTab === 'devices' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>⚡ מכשירים ({devices.length})</button>
            <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-xl text-sm font-medium ${activeTab === 'logs' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>📜 לוג אירועים ({logs.length})</button>
            <button onClick={handleLogout} className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition font-medium">התנתק</button>
          </div>
        </header>

        {/* תוכן הטאבים - התקני מכשירים, אוטומציות ולוגים */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          {activeTab === 'devices' && (
            <div>
              <h2 className="text-lg font-bold mb-4">מכשירים משוייכים</h2>
              {devices.length === 0 ? (
                <p className="text-slate-400">לא נמצאו מכשירים או שהשרת בטעינה...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {devices.map(dev => (
                    <div key={dev.id} className="p-4 border rounded-xl flex justify-between items-center">
                      <div>
                        <p className="font-bold">{dev.name}</p>
                        <p className="text-xs text-slate-400">{dev.id}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${dev.online ? 'bg-green-100 text-green-800' : 'bg-slate-100'}`}>{dev.online ? 'מחובר' : 'לא מחובר'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
