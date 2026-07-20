import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types';
import api from '../api/client';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthState {
  token: string | null;
  user: User | null;
  donorId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  registerFcmToken: (fcmToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const DONOR_KEY = 'donor_id';

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  donorId: null,
  isLoading: true,
  isAuthenticated: false,

  hydrate: async () => {
    try {
      const [token, userStr, donorId] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
        SecureStore.getItemAsync(DONOR_KEY),
      ]);
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), donorId, isAuthenticated: true, isLoading: false });

        // fallback: if donor_id wasn't cached, fetch it via /me
        if (!donorId) {
          try {
            const { data } = await api.get('/api/auth/me');
            if (data.donor_id) {
              await SecureStore.setItemAsync(DONOR_KEY, data.donor_id);
              set({ donorId: data.donor_id });
            }
          } catch { /* /me not deployed yet, will get donor_id on next login */ }
        }
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    if (data.donor_id) {
      await SecureStore.setItemAsync(DONOR_KEY, data.donor_id);
    }
    set({ token: data.token, user: data.user, donorId: data.donor_id || null, isAuthenticated: true });
  },

  register: async (email, name, password) => {
    const { data } = await api.post('/api/auth/register', { email, name, password });
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    if (data.donor_id) {
      await SecureStore.setItemAsync(DONOR_KEY, data.donor_id);
    }
    set({ token: data.token, user: data.user, donorId: data.donor_id || null, isAuthenticated: true });
  },

  registerFcmToken: async (fcmToken) => {
    await api.post('/api/auth/register-token', { fcm_token: fcmToken });
    if (get().user) {
      const updated = { ...get().user!, fcm_token: fcmToken };
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
      set({ user: updated });
    }
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
      SecureStore.deleteItemAsync(DONOR_KEY),
    ]);
    set({ token: null, user: null, donorId: null, isAuthenticated: false });
  },
}));
