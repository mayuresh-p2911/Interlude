// ============================================================
// INTERLUDE — Shared Constants & Enumerations
// ============================================================

// ── Socket Events ────────────────────────────────────────────

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Presence
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_ACTIVITY: 'user:activity',

  // Chat — Direct Messages
  DM_SEND: 'dm:send',
  DM_RECEIVE: 'dm:receive',
  DM_TYPING_START: 'dm:typing:start',
  DM_TYPING_STOP: 'dm:typing:stop',
  DM_READ: 'dm:read',

  // Chat — Group Messages
  GROUP_MSG_SEND: 'group:message:send',
  GROUP_MSG_RECEIVE: 'group:message:receive',
  GROUP_TYPING_START: 'group:typing:start',
  GROUP_TYPING_STOP: 'group:typing:stop',

  // Watch Session
  SESSION_JOIN: 'session:join',
  SESSION_LEAVE: 'session:leave',
  SESSION_SYNC: 'session:sync',
  SESSION_PLAY: 'session:play',
  SESSION_PAUSE: 'session:pause',
  SESSION_SEEK: 'session:seek',
  SESSION_SPEED: 'session:speed',
  SESSION_END: 'session:end',
  SESSION_PARTICIPANT_JOIN: 'session:participant:join',
  SESSION_PARTICIPANT_LEAVE: 'session:participant:leave',
  SESSION_STATE: 'session:state',

  // Voice
  VOICE_JOIN: 'voice:join',
  VOICE_LEAVE: 'voice:leave',
  VOICE_OFFER: 'voice:offer',
  VOICE_ANSWER: 'voice:answer',
  VOICE_ICE_CANDIDATE: 'voice:ice:candidate',
  VOICE_MUTE: 'voice:mute',
  VOICE_UNMUTE: 'voice:unmute',
  VOICE_PARTICIPANT_JOIN: 'voice:participant:join',
  VOICE_PARTICIPANT_LEAVE: 'voice:participant:leave',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',

  // Friend
  FRIEND_REQUEST_RECEIVED: 'friend:request:received',
  FRIEND_REQUEST_ACCEPTED: 'friend:request:accepted',
} as const;

// ── Streaming Providers ───────────────────────────────────────

export const STREAMING_PROVIDERS = {
  INTERNET_ARCHIVE: 'internet_archive',
  SELF_HOSTED: 'self_hosted',
  LICENSED: 'licensed',
} as const;

export type StreamingProvider = typeof STREAMING_PROVIDERS[keyof typeof STREAMING_PROVIDERS];

// ── Movie Genres ──────────────────────────────────────────────

export const MOVIE_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Biography',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Fantasy',
  'Film Noir',
  'History',
  'Horror',
  'Music',
  'Musical',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Short',
  'Sport',
  'Thriller',
  'War',
  'Western',
] as const;

export type MovieGenre = typeof MOVIE_GENRES[number];

// ── API Routes ────────────────────────────────────────────────

export const API_ROUTES = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    ME: '/auth/me',
  },
  USERS: {
    PROFILE: (username: string) => `/users/${username}`,
    UPDATE: '/users/me',
    AVATAR: '/users/me/avatar',
    SEARCH: '/users/search',
  },
  FRIENDS: {
    LIST: '/friends',
    REQUESTS: '/friends/requests',
    SEND: (userId: string) => `/friends/request/${userId}`,
    ACCEPT: (requestId: string) => `/friends/accept/${requestId}`,
    DECLINE: (requestId: string) => `/friends/decline/${requestId}`,
    CANCEL: (requestId: string) => `/friends/cancel/${requestId}`,
    REMOVE: (userId: string) => `/friends/remove/${userId}`,
    BLOCK: (userId: string) => `/friends/block/${userId}`,
    SUGGESTIONS: '/friends/suggestions',
  },
  GROUPS: {
    LIST: '/groups',
    CREATE: '/groups',
    DETAIL: (groupId: string) => `/groups/${groupId}`,
    UPDATE: (groupId: string) => `/groups/${groupId}`,
    DELETE: (groupId: string) => `/groups/${groupId}`,
    INVITE: (groupId: string) => `/groups/${groupId}/invite`,
    LEAVE: (groupId: string) => `/groups/${groupId}/leave`,
    QUEUE: (groupId: string) => `/groups/${groupId}/queue`,
  },
  MOVIES: {
    LIST: '/movies',
    TRENDING: '/movies/trending',
    SEARCH: '/movies/search',
    DETAIL: (movieId: string) => `/movies/${movieId}`,
    GENRES: '/movies/genres',
    BY_GENRE: (genre: string) => `/movies/genre/${genre}`,
    STREAM_URL: (movieId: string) => `/movies/${movieId}/stream`,
    WATCHLIST: '/movies/watchlist',
    CONTINUE_WATCHING: '/movies/continue-watching',
    HISTORY: '/movies/history',
    RECOMMENDED: '/movies/recommended',
  },
  SESSIONS: {
    CREATE: '/sessions',
    JOIN: (sessionId: string) => `/sessions/${sessionId}/join`,
    LEAVE: (sessionId: string) => `/sessions/${sessionId}/leave`,
    DETAIL: (sessionId: string) => `/sessions/${sessionId}`,
  },
  MESSAGES: {
    CONVERSATIONS: '/messages/conversations',
    DMS: (userId: string) => `/messages/dm/${userId}`,
    GROUP: (groupId: string) => `/messages/group/${groupId}`,
    SEND_DM: (userId: string) => `/messages/dm/${userId}`,
    SEND_GROUP: (groupId: string) => `/messages/group/${groupId}`,
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    READ: (id: string) => `/notifications/${id}/read`,
    READ_ALL: '/notifications/read-all',
  },
  SETTINGS: {
    GET: '/settings',
    UPDATE: '/settings',
  },
  ADMIN: {
    STATS: '/admin/stats',
    USERS: '/admin/users',
    USER: (userId: string) => `/admin/users/${userId}`,
    MOVIES: '/admin/movies',
    REPORTS: '/admin/reports',
    STREAMING_CONFIG: '/admin/streaming-config',
  },
} as const;

// ── Pagination Defaults ───────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ── Player Constants ──────────────────────────────────────────

export const PLAYER = {
  SYNC_THRESHOLD_SECONDS: 2,
  SEEK_DEBOUNCE_MS: 500,
  HEARTBEAT_INTERVAL_MS: 5000,
} as const;
