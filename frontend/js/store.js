import { STORAGE_KEYS } from './config.js';

const state = {
  token: localStorage.getItem(STORAGE_KEYS.token),
  user: JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null')
};
const listeners = new Set();

export const getState = () => ({ ...state });
export const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export const setSession = ({ token, user }) => {
  state.token = token;
  state.user = user;
  localStorage.setItem(STORAGE_KEYS.token, token);
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  listeners.forEach((listener) => listener(getState()));
};
export const clearSession = () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
  listeners.forEach((listener) => listener(getState()));
};
