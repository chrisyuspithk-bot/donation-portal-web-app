import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

export const api = axios.create({ baseURL: '/api' });

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

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
};

// Donations
export const donationsApi = {
  getAll: (params?: Record<string, string>) => api.get('/admin/donations', { params }),
  resendReceipts: (donationIds: string[]) => api.post('/admin/receipts/resend', { donation_ids: donationIds }),
};

// Analytics
export const analyticsApi = {
  get: (days?: number) => api.get('/admin/analytics', { params: { days } }),
};

// Chat
export const chatApi = {
  getSessions: () => api.get('/admin/chat/sessions'),
};

// Notifications
export const notificationsApi = {
  broadcast: (data: { title: string; body: string; segment?: any; scheduled_at?: string }) =>
    api.post('/admin/notifications/broadcast', data),
};
