const backendOrigin = window.location.port === '5500' ? `${window.location.protocol}//${window.location.hostname}:4000` : window.location.origin;
export const API_ORIGIN = backendOrigin;
export const API_URL = `${backendOrigin}/api`;
export const SOCKET_URL = backendOrigin;
export const STORAGE_KEYS = { token: 'konekta_token', user: 'konekta_user' };
