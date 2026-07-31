import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface AuthUser {
  _id: string;
  username: string;
  email: string;
  age?: number;
  pronouns?: string;
  avatar?: string;
  bio?: string;
  customStatus?: { text: string; expiresAt: Date } | null;
  isAdmin: boolean;
  isVerified: boolean;
  onlineStatus: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, email: string, password: string, age: number) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email, password, rememberMe) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login({ email, password, rememberMe });
          const { user, accessToken } = res.data as { user: AuthUser; accessToken: string };
          localStorage.setItem('access_token', accessToken);
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (username, email, password, age) => {
        set({ isLoading: true });
        try {
          const res = await authApi.register({ username, email, password, age });
          const { user, accessToken } = res.data as { user: AuthUser; accessToken: string };
          localStorage.setItem('access_token', accessToken);
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {}
        localStorage.removeItem('access_token');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const res = await authApi.me();
          set({ user: res.data as AuthUser, isAuthenticated: true });
        } catch {
          get().clearAuth();
        }
      },

      setUser: (user) => set({ user }),
      setToken: (token) => {
        localStorage.setItem('access_token', token);
        set({ accessToken: token, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('access_token');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'interlude-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
