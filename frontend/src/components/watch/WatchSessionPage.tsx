'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sessionsApi } from '@/lib/api';
import VideoPlayer from './VideoPlayer';
import ChatWindow from './ChatWindow';
import VoiceChat from './VoiceChat';
import { getSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';

export default function WatchSessionPage({ sessionId }: { sessionId: string }) {
  const { user } = useAuthStore();
  const socket = getSocket();
  const [participants, setParticipants] = useState<unknown[]>([]);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['watch-session', sessionId],
    queryFn: () => sessionsApi.getState(sessionId),
  });

  const session = (sessionData?.data as Record<string, unknown>) ?? {};
  const movie = (session.movie as Record<string, unknown>) ?? {};
  const streamUrl = String(movie.streamUrl ?? '');
  const title = String(movie.title ?? 'Watch Party');

  useEffect(() => {
    if (!socket) return;

    socket.emit('session:join', { sessionId });

    socket.on('session:participant:join', (data: { username: string }) => {
      setParticipants((prev) => [...prev, data]);
    });

    socket.on('session:participant:leave', (data: { userId: string }) => {
      setParticipants((prev) => prev.filter((p: any) => p.userId !== data.userId));
    });

    return () => {
      socket.emit('session:leave', { sessionId });
      socket.off('session:participant:join');
      socket.off('session:participant:leave');
    };
  }, [socket, sessionId]);

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="w-10 h-10 border-2 border-blue-electric/30 border-t-blue-electric rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-80px)]">
      {/* Main Player Column */}
      <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">{title}</h1>
            <p className="text-xs text-text-muted">Watch Party Room</p>
          </div>

          <VoiceChat roomId={sessionId} />
        </div>

        <VideoPlayer
          streamUrl={streamUrl}
          onPlay={() => socket?.emit('session:play', { sessionId, currentTime: 0 })}
          onPause={() => socket?.emit('session:pause', { sessionId, currentTime: 0 })}
          onSeek={(time) => socket?.emit('session:seek', { sessionId, currentTime: time })}
        />
      </div>

      {/* Sidebar Chat Column */}
      <div className="h-full">
        <ChatWindow sessionId={sessionId} />
      </div>
    </div>
  );
}
