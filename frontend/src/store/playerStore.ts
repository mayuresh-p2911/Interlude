import { create } from 'zustand';

type PlayerState = 'idle' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error';

interface PlayerStore {
  sessionId: string | null;
  movieId: string | null;
  streamUrl: string | null;
  state: PlayerState;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  isPiP: boolean;
  selectedSubtitle: string;
  selectedAudio: string;
  isInSession: boolean;
  isHost: boolean;

  setSession: (sessionId: string, movieId: string, isHost: boolean) => void;
  setStreamUrl: (url: string) => void;
  setState: (state: PlayerState) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  toggleFullscreen: () => void;
  togglePiP: () => void;
  setSubtitle: (lang: string) => void;
  setAudio: (lang: string) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  movieId: null,
  streamUrl: null,
  state: 'idle' as PlayerState,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  isFullscreen: false,
  isPiP: false,
  selectedSubtitle: '',
  selectedAudio: '',
  isInSession: false,
  isHost: false,
};

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  ...initialState,

  setSession: (sessionId, movieId, isHost) =>
    set({ sessionId, movieId, isHost, isInSession: true }),

  setStreamUrl: (url) => set({ streamUrl: url }),

  setState: (state) => set({ state }),

  setCurrentTime: (time) => set({ currentTime: time }),

  setDuration: (duration) => set({ duration }),

  setVolume: (volume) =>
    set({ volume, isMuted: volume === 0 }),

  toggleMute: () =>
    set((s) => ({ isMuted: !s.isMuted })),

  setPlaybackRate: (rate) => set({ playbackRate: rate }),

  toggleFullscreen: () =>
    set((s) => ({ isFullscreen: !s.isFullscreen })),

  togglePiP: () =>
    set((s) => ({ isPiP: !s.isPiP })),

  setSubtitle: (lang) => set({ selectedSubtitle: lang }),

  setAudio: (lang) => set({ selectedAudio: lang }),

  reset: () => set(initialState),
}));
