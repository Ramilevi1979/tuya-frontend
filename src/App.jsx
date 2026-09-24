import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, LayoutGrid, LogOut, RefreshCw } from 'lucide-react';
import { configureApi } from './api';
import { clearSession, loadSession, saveSession } from './session';
import { groupDevices } from './lib/devices';
import { useDevices } from './hooks/useDevices';
import { useAutomations } from './hooks/useAutomations';
import LoginScreen from './components/LoginScreen';
import DevicesView from './components/DevicesView';
import AutomationsView from './components/AutomationsView';
import AutomationSheet from './components/AutomationSheet';
import { Toasts } from './components/ui';

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, kind = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list.slice(-2), { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 5000 : 3000);
  }, []);
  return { toasts, toast };
}

function Home({ session, onLogout, toast }) {
  const [tab, setTab] = useState('devices');
  const [sheetOpen, setSheetOpen] = useState(false);

  const devices = useDevices(true, toast);
  const autos = useAutomations(true, toast);

  const groups = useMemo(() => groupDevices(devices.devices), [devices.devices]);
  const known = [...groups.ac, ...groups.tv, ...groups.switch];
  const connected = known.filter((d) => d.online).length;
  const firstName = (session.user?.name || '').split(' ')[0];

  const refresh = () => {
    devices.reload({ silent: false, force: true });
    autos.reload();
  };

  const saveAutomation = async (payload) => {
    await autos.create(payload);
    setSheetOpen(false);
    toast('התזמון נשמר');
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>הבית שלי</h1>
          <p>
            {devices.phase === 'ready' && known.length > 0
              ? `${known.length} מכשירים, ${connected} מחוברים`
              : firstName ? `שלום, ${firstName}` : ' '}
          </p>
        </div>
        <div className="topbar-actions">
          <button type="button" className={`icon-btn ${devices.refreshing ? 'spinning' : ''}`} aria-label="רענון" onClick={refresh}>
            <RefreshCw size={20} />
          </button>
          <button type="button" className="icon-btn" aria-label="התנתקות" onClick={onLogout}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main>
        {tab === 'devices' ? (
          <DevicesView
            devices={devices.devices}
            phase={devices.phase}
            error={devices.error}
            slow={devices.slow}
            onRetry={devices.reload}
            onToggle={devices.toggleChannel}
            toast={toast}
          />
        ) : (
          <AutomationsView
            automations={autos.automations}
            loaded={autos.loaded}
            onAdd={() => setSheetOpen(true)}
            onToggle={autos.setEnabled}
            onRemove={autos.remove}
          />
        )}
      </main>

      <nav className="tabbar" aria-label="ניווט ראשי">
        <div className="tabs">
          <button type="button" className="tab" aria-current={tab === 'devices' ? 'page' : undefined} onClick={() => setTab('devices')}>
            <LayoutGrid size={19} /> מכשירים
          </button>
          <button type="button" className="tab" aria-current={tab === 'automations' ? 'page' : undefined} onClick={() => setTab('automations')}>
            <CalendarClock size={19} /> תזמונים
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <AutomationSheet groups={groups} onSave={saveAutomation} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(loadSession);
  const { toasts, toast } = useToasts();
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const logout = useCallback(() => { clearSession(); setSession(null); }, []);

  useEffect(() => {
    configureApi({
      getToken: () => sessionRef.current?.token,
      onUnauthorized: () => {
        if (!sessionRef.current) return;
        logout();
        toast('ההתחברות פגה, יש להתחבר מחדש', 'error');
      },
    });
  }, [logout, toast]);

  const handleSession = (next) => { saveSession(next); setSession(next); };

  return (
    <>
      {session ? (
        <Home session={session} onLogout={logout} toast={toast} />
      ) : (
        <LoginScreen onSession={handleSession} />
      )}
      <Toasts toasts={toasts} />
    </>
  );
}
