import { create } from 'zustand';

interface VoicePeer {
  userId: string;
  username: string;
  isMuted: boolean;
  stream?: MediaStream;
}

interface VoiceStore {
  isInVoice: boolean;
  roomId: string | null;
  isMuted: boolean;
  localStream: MediaStream | null;
  peers: VoicePeer[];
  peerConnections: Map<string, RTCPeerConnection>;
  selectedMicrophone: string;

  setRoom: (roomId: string) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  addPeer: (peer: VoicePeer) => void;
  removePeer: (userId: string) => void;
  updatePeerMute: (userId: string, isMuted: boolean) => void;
  addPeerStream: (userId: string, stream: MediaStream) => void;
  addPeerConnection: (userId: string, pc: RTCPeerConnection) => void;
  removePeerConnection: (userId: string) => void;
  setMicrophone: (deviceId: string) => void;
  leaveVoice: () => void;
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  isInVoice: false,
  roomId: null,
  isMuted: false,
  localStream: null,
  peers: [],
  peerConnections: new Map(),
  selectedMicrophone: 'default',

  setRoom: (roomId) => set({ roomId, isInVoice: true }),

  setMuted: (muted) => {
    const { localStream } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    set({ isMuted: muted });
  },

  toggleMute: () => {
    const { isMuted } = get();
    get().setMuted(!isMuted);
  },

  setLocalStream: (stream) => set({ localStream: stream }),

  addPeer: (peer) =>
    set((s) => ({
      peers: s.peers.find((p) => p.userId === peer.userId)
        ? s.peers.map((p) => (p.userId === peer.userId ? peer : p))
        : [...s.peers, peer],
    })),

  removePeer: (userId) =>
    set((s) => ({ peers: s.peers.filter((p) => p.userId !== userId) })),

  updatePeerMute: (userId, isMuted) =>
    set((s) => ({
      peers: s.peers.map((p) => (p.userId === userId ? { ...p, isMuted } : p)),
    })),

  addPeerStream: (userId, stream) =>
    set((s) => ({
      peers: s.peers.map((p) => (p.userId === userId ? { ...p, stream } : p)),
    })),

  addPeerConnection: (userId, pc) =>
    set((s) => {
      const map = new Map(s.peerConnections);
      map.set(userId, pc);
      return { peerConnections: map };
    }),

  removePeerConnection: (userId) =>
    set((s) => {
      const map = new Map(s.peerConnections);
      map.delete(userId);
      return { peerConnections: map };
    }),

  setMicrophone: (deviceId) => set({ selectedMicrophone: deviceId }),

  leaveVoice: () => {
    const { localStream, peerConnections } = get();
    localStream?.getTracks().forEach((t) => t.stop());
    peerConnections.forEach((pc) => pc.close());
    set({
      isInVoice: false,
      roomId: null,
      localStream: null,
      peers: [],
      peerConnections: new Map(),
      isMuted: false,
    });
  },
}));
