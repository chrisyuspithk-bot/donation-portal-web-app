import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Callbacks set by authStore to break the require cycle
let getToken: (() => string | null) | null = null;
let onUnauthorized: (() => void) | null = null;

export function setTokenGetter(fn: () => string | null) { getToken = fn; }
export function setUnauthorizedHandler(fn: () => void) { onUnauthorized = fn; }

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default api;
