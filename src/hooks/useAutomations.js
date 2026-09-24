import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

export function useAutomations(enabled, toast) {
  const [automations, setAutomations] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      setAutomations(await api.getAutomations());
      setLoaded(true);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => { if (enabled) reload(); }, [enabled, reload]);

  const create = useCallback(async (payload) => {
    const created = await api.createAutomation(payload);
    setAutomations((list) => [...list, created]);
    return created;
  }, []);

  const setEnabled = useCallback(async (id, enabledNext) => {
    const patch = (value) => setAutomations((list) => list.map((a) => (a.id === id ? { ...a, enabled: value } : a)));
    patch(enabledNext);
    try {
      const updated = await api.updateAutomation(id, { enabled: enabledNext });
      setAutomations((list) => list.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      patch(!enabledNext);
      toast(err.message, 'error');
    }
  }, [toast]);

  const remove = useCallback(async (id) => {
    try {
      await api.deleteAutomation(id);
      setAutomations((list) => list.filter((a) => a.id !== id));
      toast('התזמון נמחק');
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  return { automations, loaded, reload, create, setEnabled, remove };
}
