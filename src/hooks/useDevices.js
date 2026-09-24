import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';

const POLL_MS = 30_000;

export function useDevices(enabled, toast) {
  const [devices, setDevices] = useState([]);
  const [phase, setPhase] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [slow, setSlow] = useState(false); // the free hosting tier can take a minute to wake up
  const [refreshing, setRefreshing] = useState(false);
  const loaded = useRef(false);

  const load = useCallback(async ({ silent = true, force = false } = {}) => {
    if (!silent) setRefreshing(true);
    const slowTimer = !loaded.current ? setTimeout(() => setSlow(true), 4000) : null;
    try {
      const list = await api.getDevices({ refresh: force });
      setDevices(list);
      setPhase('ready');
      setError(null);
      loaded.current = true;
    } catch (err) {
      if (!loaded.current) { setPhase('error'); setError(err.message); }
      else if (!silent) toast(err.message, 'error');
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setRefreshing(false);
    }
  }, [toast]);

  // Initial load, then keep fresh while the tab is visible.
  useEffect(() => {
    if (!enabled) return undefined;
    load({ silent: true });
    const tick = () => { if (document.visibilityState === 'visible') load({ silent: true }); };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [enabled, load]);

  const setChannel = useCallback((id, code, value) => {
    setDevices((list) => list.map((d) => (d.id !== id ? d : {
      ...d,
      status: (d.status || []).map((s) => (s.code === code ? { ...s, value } : s)),
    })));
  }, []);

  /** Flip immediately, confirm with the server, undo if it fails. */
  const toggleChannel = useCallback(async (id, code, next) => {
    setChannel(id, code, next);
    try {
      await api.sendSwitch(id, code, next);
      setTimeout(() => load({ silent: true, force: true }), 1500);
    } catch (err) {
      setChannel(id, code, !next);
      toast(err.message, 'error');
    }
  }, [load, setChannel, toast]);

  return { devices, phase, error, slow, refreshing, reload: load, toggleChannel };
}
