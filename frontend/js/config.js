const backendOrigin = window.location.port === '5500' ? `${window.location.protocol}//${window.location.hostname}:4000` : window.location.origin;
export const API_ORIGIN = backendOrigin;
export const toAbsoluteUrl = (value, fallback = './assets/placeholder.svg') => {
  if (!value || typeof value !== 'string') return fallback;
  const cleaned = value.trim();
  if (!cleaned) return fallback;
  if (cleaned.startsWith('/uploads') || cleaned.startsWith('uploads/') || cleaned.includes('/uploads/')) return fallback;
  if (cleaned.startsWith('http')) return cleaned;
  if (cleaned.startsWith('./') || cleaned.startsWith('../') || cleaned.startsWith('/')) return new URL(cleaned, window.location.origin).toString();
  return new URL(`/${cleaned.replace(/^\.?\//, '')}`, window.location.origin).toString();
};
export const API_URL = `${backendOrigin}/api`;
export const SOCKET_URL = backendOrigin;
export const STORAGE_KEYS = { token: 'konekta_token', user: 'konekta_user' };
