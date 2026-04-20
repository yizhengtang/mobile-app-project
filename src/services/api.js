import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'wayfarer_token';

// ── Token helpers ─────────────────────────────────────────────────────────────
export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function saveToken(token) {
  return AsyncStorage.setItem(TOKEN_KEY, token);
}
export async function removeToken() {
  return AsyncStorage.removeItem(TOKEN_KEY);
}

// ── Base request ──────────────────────────────────────────────────────────────
async function request(method, path, body) {
  const token = await getToken();

  //creates the header object with one entry in it. it tells the backend the data being sent is json format.
  const headers = { 'Content-Type': 'application/json' };
  //this statement only adds the auth header if a token exists, so if the user is not logged in, or no token in
  //async storage, this will be skipped.
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    //if body is passed, convert the JS obj to a json string before sneding
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();

  if (!res.ok) {
    // Surface the first validation error message if present, otherwise general message
    const msg =
      json.errors?.[0]?.message ||
      json.message ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return json;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (name, email, password) =>
    request('POST', '/api/auth/register', { name, email, password }),

  login: (email, password) =>
    request('POST', '/api/auth/login', { email, password }),

  getMe: () => request('GET', '/api/auth/me'),
};

// ── Trips ─────────────────────────────────────────────────────────────────────
export const tripsAPI = {
  getAll: () => request('GET', '/api/trips'),

  // Returns { trip, plan }
  getOne: (id) => request('GET', `/api/trips/${id}`),

  create: (data) => request('POST', '/api/trips', data),

  update: (id, data) => request('PATCH', `/api/trips/${id}`, data),

  delete: (id) => request('DELETE', `/api/trips/${id}`),

  // Synchronous — holds connection for 10-20s while OpenAI generates the plan
  generate: (id) => request('POST', `/api/trips/${id}/generate`),

  getChatHistory: (id) => request('GET', `/api/trips/${id}/chat`),

  sendChat: (id, message) =>
    request('POST', `/api/trips/${id}/chat`, { message }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsAPI = {
  savePushToken: (pushToken) =>
    request('PATCH', '/api/auth/pushtoken', { pushToken }),
};
