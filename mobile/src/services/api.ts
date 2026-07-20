import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// Android emulator: http://10.0.2.2:4000  |  iOS simulator: http://localhost:4000  |  Real device: your Mac's LAN IP
const API_BASE = 'http://10.0.2.2:4000';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) useAuthStore.getState().logout();
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  registerFcmToken: (fcmToken: string) =>
    api.post('/auth/register-token', { fcm_token: fcmToken }),
};

export const donationsApi = {
  createIntent: (amount: number, donorId: string) =>
    api.post('/donations/create-intent', { amount, donor_id: donorId, currency: 'usd' }),
  confirmPayment: (intentId: string) =>
    api.get(`/donations/confirm/${intentId}`),
  history: (donorId: string, page = 1) =>
    api.get(`/donations/history/${donorId}`, { params: { page } }),
};

export const receiptsApi = {
  get: (donationId: string) => api.get(`/receipts/${donationId}`),
  downloadUrl: (donationId: string) => `${API_BASE}/receipts/${donationId}/download`,
};
