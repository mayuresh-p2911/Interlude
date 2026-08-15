import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor — Attach access token ─────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response Interceptor — Handle 401 and refresh ────────────
let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

type TokenRefreshListener = (newToken: string) => void;
const refreshListeners: TokenRefreshListener[] = [];

type TokenRefreshFailedListener = () => void;
const refreshFailedListeners: TokenRefreshFailedListener[] = [];

export function onAccessTokenRefreshed(listener: TokenRefreshListener) {
  refreshListeners.push(listener);
  return () => {
    const idx = refreshListeners.indexOf(listener);
    if (idx !== -1) refreshListeners.splice(idx, 1);
  };
}

export function onTokenRefreshFailedEvent(listener: TokenRefreshFailedListener) {
  refreshFailedListeners.push(listener);
  return () => {
    const idx = refreshFailedListeners.indexOf(listener);
    if (idx !== -1) refreshFailedListeners.splice(idx, 1);
  };
}

function notifyTokenRefreshed(newToken: string) {
  refreshListeners.forEach((fn) => {
    try {
      fn(newToken);
    } catch {}
  });
}

function notifyTokenRefreshFailed() {
  refreshFailedListeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((sub) => sub.resolve(token));
  refreshSubscribers = [];
}

function onTokenRefreshFailed(err: unknown) {
  refreshSubscribers.forEach((sub) => sub.reject(err));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    // Only exclude specific non-authenticated auth endpoints from token refresh
    const NON_REFRESHABLE_ENDPOINTS = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/verify-email',
      '/auth/captcha',
      '/auth/verify-2fa',
      '/auth/resend-2fa',
    ];
    const isNonRefreshable = NON_REFRESHABLE_ENDPOINTS.some((ep) =>
      originalRequest?.url?.includes(ep),
    );

    if (error.response?.status === 401 && !originalRequest?._retry && !isNonRefreshable) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject: (err: unknown) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post<{ accessToken: string }>('/auth/refresh');
        const { accessToken } = response.data;
        localStorage.setItem('access_token', accessToken);
        notifyTokenRefreshed(accessToken);
        onTokenRefreshed(accessToken);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        onTokenRefreshFailed(refreshErr);
        notifyTokenRefreshFailed();
        localStorage.removeItem('access_token');
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
          window.location.href = '/auth/login';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// ── API Helper Functions ──────────────────────────────────────

export const authApi = {
  getCaptcha: () => api.get('/auth/captcha'),
  register: (data: {
    username: string;
    email: string;
    password: string;
    age: number;
    captchaToken?: string;
    captchaInput?: string;
  }) => api.post('/auth/register', data),
  login: (data: {
    email: string;
    password: string;
    rememberMe?: boolean;
    captchaToken?: string;
    captchaInput?: string;
  }) => api.post('/auth/login', data),
  verify2FA: (data: { tempToken: string; code: string }) => api.post('/auth/verify-2fa', data),
  resend2FA: (data: { tempToken: string }) => api.post('/auth/resend-2fa', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  getProfile: (username: string) => api.get(`/users/${username}`),
  getUserFriends: (username: string) => api.get(`/users/${username}/friends`),
  updateProfile: (data: { username?: string; bio?: string; pronouns?: string; customStatusText?: string }) =>
    api.patch('/users/me', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/users/me/avatar', formData);
  },
  searchUsers: (query: string) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
  getWatchlist: (page = 1) => api.get(`/users/me/watchlist?page=${page}`),
  addToWatchlist: (movieId: string) => api.post(`/users/me/watchlist/${movieId}`),
  removeFromWatchlist: (movieId: string) => api.delete(`/users/me/watchlist/${movieId}`),
  getContinueWatching: () => api.get('/users/me/continue-watching'),
  getHistory: (page = 1) => api.get(`/users/me/history?page=${page}`),
  getSettings: () => api.get('/users/me/settings'),
  updateSettings: (data: unknown) => api.patch('/users/me/settings', data),
};

export const friendsApi = {
  getFriends: () => api.get('/friends'),
  getRequests: () => api.get('/friends/requests'),
  getSentRequests: () => api.get('/friends/requests/sent'),
  getSuggestions: () => api.get('/friends/suggestions'),
  sendRequest: (userId: string) => api.post(`/friends/request/${userId}`),
  acceptRequest: (requestId: string) => api.post(`/friends/accept/${requestId}`),
  declineRequest: (requestId: string) => api.post(`/friends/decline/${requestId}`),
  cancelRequest: (requestId: string) => api.delete(`/friends/cancel/${requestId}`),
  removeFriend: (friendId: string) => api.delete(`/friends/remove/${friendId}`),
  blockUser: (userId: string) => api.post(`/friends/block/${userId}`),
};

export const groupsApi = {
  getGroups: () => api.get('/groups'),
  createGroup: (data: { name: string; description?: string }) => api.post('/groups', data),
  getGroup: (id: string) => api.get(`/groups/${id}`),
  updateGroup: (id: string, data: { name?: string; description?: string }) =>
    api.patch(`/groups/${id}`, data),
  deleteGroup: (id: string) => api.delete(`/groups/${id}`),
  invite: (id: string, memberIds: string[]) => api.post(`/groups/${id}/invite`, { memberIds }),
  leave: (id: string) => api.delete(`/groups/${id}/leave`),
  addToQueue: (id: string, data: { movieId: string; title: string; poster?: string }) =>
    api.post(`/groups/${id}/queue`, data),
  removeFromQueue: (id: string, movieId: string) => api.delete(`/groups/${id}/queue/${movieId}`),
};

export const moviesApi = {
  getTrending: (limit = 20) => api.get(`/movies/trending?limit=${limit}`),
  getRecent: (limit = 20) => api.get(`/movies/recent?limit=${limit}`),
  search: (query: string, page = 1) =>
    api.get(`/movies/search?q=${encodeURIComponent(query)}&page=${page}`),
  getMovie: (id: string) => api.get(`/movies/${id}`),
  getGenres: () => api.get('/movies/genres'),
  getByGenre: (genre: string, page = 1) =>
    api.get(`/movies/genre/${encodeURIComponent(genre)}?page=${page}`),
  getStreamUrl: (id: string) => api.get(`/movies/${id}/stream`),
  getRecommended: () => api.get('/movies/recommended'),
};

export const sessionsApi = {
  create: (movieId: string, isPrivate?: boolean, groupId?: string) =>
    api.post('/sessions', { movieId, isPrivate, groupId }),
  join: (sessionId: string) => api.post(`/sessions/${sessionId}/join`),
  leave: (sessionId: string) => api.delete(`/sessions/${sessionId}/leave`),
  getState: (sessionId: string) => api.get(`/sessions/${sessionId}`),
  invite: (sessionId: string, friendIds: string[]) =>
    api.post(`/sessions/${sessionId}/invite`, { friendIds }),
};

export const chatApi = {
  getConversations: () => api.get('/messages/conversations'),
  getDMs: (userId: string, page = 1) => api.get(`/messages/dm/${userId}?page=${page}`),
  sendDM: (userId: string, content: string, type?: string) =>
    api.post(`/messages/dm/${userId}`, { content, type }),
  getGroupMessages: (groupId: string, page = 1) =>
    api.get(`/messages/group/${groupId}?page=${page}`),
  sendGroupMessage: (groupId: string, content: string) =>
    api.post(`/messages/group/${groupId}`, { content }),
};

export const notificationsApi = {
  getAll: (page = 1) => api.get(`/notifications?page=${page}`),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export const voiceApi = {
  getIceServers: () => api.get('/voice/ice-servers'),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (page = 1, search?: string) =>
    api.get(`/admin/users?page=${page}${search ? `&search=${search}` : ''}`),
  updateUser: (userId: string, data: { isAdmin?: boolean; isBlocked?: boolean }) =>
    api.patch(`/admin/users/${userId}`, data),
  getMovies: (page = 1) => api.get(`/admin/movies?page=${page}`),
  getStreamingConfig: () => api.get('/admin/streaming-config'),
};
