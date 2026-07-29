// ============================================================
// INTERLUDE — Shared Type Definitions
// ============================================================

// ── User ────────────────────────────────────────────────────

export type OnlineStatus = 'online' | 'away' | 'offline';

export interface IUser {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  isAdmin: boolean;
  isVerified: boolean;
  isBlocked: boolean;
  onlineStatus: OnlineStatus;
  currentActivity?: IActivity;
  joinedAt: string;
  updatedAt: string;
}

export interface IActivity {
  type: 'watching' | 'in_session' | 'browsing' | 'idle';
  movieId?: string;
  movieTitle?: string;
  sessionId?: string;
}

export interface IPublicUser {
  _id: string;
  username: string;
  avatar?: string;
  bio?: string;
  onlineStatus: OnlineStatus;
  currentActivity?: IActivity;
  joinedAt: string;
}

// ── Auth ────────────────────────────────────────────────────

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthResponse {
  user: IUser;
  tokens: IAuthTokens;
}

// ── Friend ──────────────────────────────────────────────────

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface IFriendRequest {
  _id: string;
  sender: IPublicUser;
  receiver: IPublicUser;
  status: FriendRequestStatus;
  createdAt: string;
}

export interface IFriendship {
  _id: string;
  user: IPublicUser;
  friend: IPublicUser;
  createdAt: string;
}

// ── Group ───────────────────────────────────────────────────

export interface IGroup {
  _id: string;
  name: string;
  picture?: string;
  description?: string;
  members: IPublicUser[];
  createdBy: string;
  movieQueue: IQueueItem[];
  createdAt: string;
  updatedAt: string;
}

export interface IQueueItem {
  movieId: string;
  title: string;
  poster?: string;
  addedBy: string;
  addedAt: string;
}

// ── Movie ───────────────────────────────────────────────────

export interface IMovie {
  _id: string;
  providerId: string;
  provider: string;
  title: string;
  description: string;
  poster?: string;
  backdrop?: string;
  year?: number;
  runtime?: number;
  genres: string[];
  language?: string;
  rating?: number;
  cast?: string[];
  director?: string;
  streamUrl?: string;
  subtitleTracks?: ISubtitleTrack[];
  audioTracks?: IAudioTrack[];
  createdAt: string;
}

export interface ISubtitleTrack {
  label: string;
  language: string;
  url: string;
}

export interface IAudioTrack {
  label: string;
  language: string;
}

// ── Watch Session ───────────────────────────────────────────

export type SessionState = 'waiting' | 'playing' | 'paused' | 'ended';

export interface IWatchSession {
  _id: string;
  host: IPublicUser;
  movie: IMovie;
  participants: ISessionParticipant[];
  state: SessionState;
  currentTime: number;
  playbackRate: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface ISessionParticipant {
  user: IPublicUser;
  joinedAt: string;
  isActive: boolean;
}

// ── Playback Sync ────────────────────────────────────────────

export interface ISyncPayload {
  sessionId: string;
  currentTime: number;
  state: 'playing' | 'paused';
  playbackRate: number;
  timestamp: number;
}

// ── Message ─────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'movie_share' | 'system';

export interface IMessage {
  _id: string;
  sender: IPublicUser;
  content: string;
  type: MessageType;
  movieRef?: Pick<IMovie, '_id' | 'title' | 'poster'>;
  imageUrl?: string;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IDirectMessage extends IMessage {
  recipient: string;
  conversationId: string;
}

export interface IGroupMessage extends IMessage {
  groupId: string;
}

// ── Conversation ────────────────────────────────────────────

export interface IConversation {
  _id: string;
  participants: IPublicUser[];
  lastMessage?: IMessage;
  unreadCount: number;
  updatedAt: string;
}

// ── Notification ─────────────────────────────────────────────

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'group_invite'
  | 'watch_invite'
  | 'message'
  | 'friend_online'
  | 'watch_started'
  | 'system';

export interface INotification {
  _id: string;
  recipient: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

// ── Voice Session ────────────────────────────────────────────

export interface IVoiceSession {
  _id: string;
  roomId: string;
  participants: IVoiceParticipant[];
  createdAt: string;
}

export interface IVoiceParticipant {
  user: IPublicUser;
  isMuted: boolean;
  joinedAt: string;
}

// ── Pagination ───────────────────────────────────────────────

export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ── WebRTC Signalling ────────────────────────────────────────

export interface IWebRTCOffer {
  targetUserId: string;
  roomId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface IWebRTCAnswer {
  targetUserId: string;
  roomId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface IWebRTCIceCandidate {
  targetUserId: string;
  roomId: string;
  candidate: RTCIceCandidateInit;
}

// ── Watch History ────────────────────────────────────────────

export interface IWatchHistory {
  _id: string;
  userId: string;
  movie: Pick<IMovie, '_id' | 'title' | 'poster'>;
  watchedAt: string;
  duration: number;
  completed: boolean;
}

export interface IContinueWatching {
  _id: string;
  userId: string;
  movie: Pick<IMovie, '_id' | 'title' | 'poster' | 'runtime'>;
  progress: number;
  lastWatchedAt: string;
}

// ── Settings ─────────────────────────────────────────────────

export interface ISettings {
  _id: string;
  userId: string;
  notifications: {
    friendRequests: boolean;
    groupInvites: boolean;
    watchInvites: boolean;
    messages: boolean;
    friendOnline: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    showActivity: boolean;
    allowFriendRequests: boolean;
  };
  playback: {
    defaultQuality: 'auto' | '1080p' | '720p' | '480p' | '360p';
    autoplay: boolean;
    defaultSubtitles: string;
  };
  updatedAt: string;
}

// ── Admin ────────────────────────────────────────────────────

export interface IAdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMovies: number;
  activeSessions: number;
  totalGroups: number;
  messagesLastDay: number;
}

// ── Genre ────────────────────────────────────────────────────

export interface IGenre {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
}
