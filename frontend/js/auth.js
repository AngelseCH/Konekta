import { api } from './api.js';
import { clearSession, getState, setSession } from './store.js';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  setSession(response.data);
  return response.data.user;
};

export const register = async ({ name, email, password, passwordConfirmation, role }) => {
  const response = await api.post('/auth/register', { name, email, password, passwordConfirmation, role });
  setSession(response.data);
  return response.data.user;
};

export const refreshUser = async () => {
  const response = await api.get('/auth/me');
  const current = getState();
  setSession({ token: current.token, user: response.data.user });
  return response.data.user;
};

export const checkSession = async () => {
  if (!getState().token) return null;
  try { return await refreshUser(); } catch { clearSession(); return null; }
};

export const logout = async () => {
  try { if (getState().token) await api.post('/auth/logout', {}); } finally { clearSession(); }
};
