const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://tuya-backend-irpd.onrender.com/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let getToken = () => null;
let onUnauthorized = () => {};

/** Wired up once by App: how to read the session token, and what to do when it stops working. */
export function configureApi(options) {
  getToken = options.getToken ?? getToken;
  onUnauthorized = options.onUnauthorized ?? onUnauthorized;
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('אין חיבור לשרת. בדקו את האינטרנט ונסו שוב', 0);
  }

  const data = await res.json().catch(() => null);
  if (res.status === 401 && auth) onUnauthorized();
  if (!res.ok || !data || data.success === false) {
    throw new ApiError((data && data.error) || `שגיאה מהשרת (${res.status})`, res.status);
  }
  return data;
}

export const api = {
  loginWithGoogle: (credential) =>
    request('/auth/google', { method: 'POST', body: { credential }, auth: false }),

  getDevices: ({ refresh = false } = {}) =>
    request(`/devices${refresh ? '?refresh=1' : ''}`).then((d) => d.devices || []),

  sendSwitch: (deviceId, code, value) =>
    request(`/devices/${deviceId}/command`, { method: 'POST', body: { commands: [{ code, value }] } }),

  sendAc: (infraredId, remoteId, code, value) =>
    request(`/ir/${infraredId}/remotes/${remoteId}/ac-command`, { method: 'POST', body: { code, value } }),

  getAcStatus: (infraredId, remoteId) =>
    request(`/ir/${infraredId}/remotes/${remoteId}/ac-status`).then((d) => d.status),

  sendTvPower: (infraredId, remoteId, remoteIndex) =>
    request(`/ir/${infraredId}/remotes/${remoteId}/tv-command`, {
      method: 'POST',
      body: { key: 'power', remoteIndex },
    }),

  getAutomations: () => request('/automations').then((d) => d.automations || []),
  createAutomation: (payload) =>
    request('/automations', { method: 'POST', body: payload }).then((d) => d.automation),
  updateAutomation: (id, patch) =>
    request(`/automations/${id}`, { method: 'PATCH', body: patch }).then((d) => d.automation),
  deleteAutomation: (id) => request(`/automations/${id}`, { method: 'DELETE' }),
};
