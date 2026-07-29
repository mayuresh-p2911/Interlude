'use client';

import { useVoiceChat } from '@/hooks/useVoiceChat';
import { MicrophoneIcon, PhoneXMarkIcon } from '@heroicons/react/24/solid';

export default function VoiceChat({ roomId }: { roomId: string }) {
  const { isInVoice, isMuted, peers, joinVoice, leaveVoice, toggleMute } = useVoiceChat(roomId);

  if (!isInVoice) {
    return (
      <button
        onClick={joinVoice}
        className="btn-ghost text-xs py-2 px-4 flex items-center gap-2 border-blue-electric/30 text-blue-ice hover:bg-blue-electric/10"
      >
        <MicrophoneIcon className="w-4 h-4" />
        Join Voice Chat
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-2xl glass border border-blue-electric/20">
      <button
        onClick={toggleMute}
        className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
          isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-royal text-white'
        }`}
      >
        <MicrophoneIcon className="w-4 h-4" />
        {isMuted ? 'Muted' : 'Mute'}
      </button>

      <div className="flex items-center gap-1">
        {peers.map((peer) => (
          <div
            key={peer.userId}
            className={`w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-[10px] font-bold text-white relative ${
              !peer.isMuted ? 'ring-2 ring-emerald-500' : ''
            }`}
          >
            {peer.username?.[0]?.toUpperCase() ?? 'P'}
          </div>
        ))}
      </div>

      <button onClick={leaveVoice} className="p-2 rounded-xl text-red-400 hover:bg-red-500/10">
        <PhoneXMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
