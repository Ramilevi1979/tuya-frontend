const KEY = 'home.session';

export function loadSession() {
  try {
    const session = JSON.parse(localStorage.getItem(KEY));
    if (session && session.token && session.expiresAt > Date.now()) return session;
  } catch { /* corrupted or unavailable storage: treat as signed out */ }
  return null;
}

export function saveSession(session) {
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* private mode */ }
}

export function clearSession() {
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
}

/** Last state we sent to each IR air conditioner, used until the server reports its own. */
export function loadAcState(id) {
  try { return JSON.parse(localStorage.getItem(`home.ac.${id}`)); } catch { return null; }
}

export function saveAcState(id, state) {
  try { localStorage.setItem(`home.ac.${id}`, JSON.stringify(state)); } catch { /* private mode */ }
}
