import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, onAccessTokenRefreshed, onTokenRefreshFailedEvent } from '@/lib/api';

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

interface AuthResponse2FA {
  requires2FA: boolean;
  tempToken?: string;
  email?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (
    email: string,
    password: string,
    captchaToken?: string,
    captchaInput?: string,
    rememberMe?: boolean,
  ) => Promise<AuthResponse2FA>;
  register: (
    username: string,
    email: string,
    password: string,
    age: number,
    captchaToken?: string,
    captchaInput?: string,
  ) => Promise<AuthResponse2FA>;
  verify2FA: (tempToken: string, code: string) => Promise<void>;
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

      login: async (email, password, captchaToken, captchaInput, rememberMe) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login({
            email,
            password,
            rememberMe,
            captchaToken,
            captchaInput,
          });
          set({ isLoading: false });
          return res.data as AuthResponse2FA;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (username, email, password, age, captchaToken, captchaInput) => {
        set({ isLoading: true });
        try {
          const res = await authApi.register({
            username,
            email,
            password,
            age,
            captchaToken,
            captchaInput,
          });
          set({ isLoading: false });
          return res.data as AuthResponse2FA;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verify2FA: async (tempToken, code) => {
        set({ isLoading: true });
        try {
          const res = await authApi.verify2FA({ tempToken, code });
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
        let currentToken =
          get().accessToken ||
          (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);

        if (!currentToken) {
          try {
            const refreshRes = await authApi.refresh();
            const newToken = refreshRes.data.accessToken;
            get().setToken(newToken);
            currentToken = newToken;
          } catch {
            get().clearAuth();
            return;
          }
        }

        try {
          const res = await authApi.me();
          set({ user: res.data as AuthUser, isAuthenticated: true });
        } catch (meErr: unknown) {
          const status = (meErr as { response?: { status?: number } })?.response?.status;
          if (status === 401) {
            try {
              const refreshRes = await authApi.refresh();
              const newToken = refreshRes.data.accessToken;
              get().setToken(newToken);
              const retryRes = await authApi.me();
              set({ user: retryRes.data as AuthUser, isAuthenticated: true });
            } catch {
              get().clearAuth();
            }
          }
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

if (typeof window !== 'undefined') {
  onAccessTokenRefreshed((newToken) => {
    useAuthStore.getState().setToken(newToken);
  });
  onTokenRefreshFailedEvent(() => {
    useAuthStore.getState().clearAuth();
  });
}
