import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  donorId: string | null;
  setAuth: (token: string, user: User, donorId: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  donorId: null,

  setAuth: async (token, user, donorId) => {
    await SecureStore.setItemAsync('auth_token', token);
    set({ token, user, donorId });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ token: null, user: null, donorId: null });
  },

  loadStoredAuth: async () => {
    // Call on app launch - stub for now
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) set({ token });
  },
}));
