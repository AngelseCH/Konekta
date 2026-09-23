import { API_URL } from './config.js';
import { clearSession, getState } from './store.js';

export class ApiError extends Error {
  constructor(message, status, details) { super(message); this.status = status; this.details = details; }
}

export const request = async (path, options = {}) => {
  const { token } = getState();
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }
  if (!response.ok || payload.ok === false) throw new ApiError(payload.message || 'No se pudo completar la solicitud', response.status, payload.details);
  return payload;
};

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: 'PUT', body: data instanceof FormData ? data : JSON.stringify(data) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData, method = 'POST') => request(path, { method, body: formData })
};
