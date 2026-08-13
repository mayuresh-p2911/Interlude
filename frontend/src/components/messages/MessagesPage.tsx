'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { chatApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/hooks/useSocket';
import ChatWindow from '@/components/watch/ChatWindow';

export default function MessagesPage({ activeUserId }: { activeUserId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const socket = getSocket();

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.getConversations(),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!socket) return;
    const handleDmReceive = () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };
    socket.on('dm:receive', handleDmReceive);
    return () => {
      socket.off('dm:receive', handleDmReceive);
    };
  }, [socket, queryClient]);

  const conversations = (data?.data as Record<string, unknown>[]) ?? [];

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto h-[calc(100dvh-64px)] relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-full">
        {/* Conversations List */}
        <div
          className={`${
            activeUserId ? 'hidden lg:block' : 'block'
          } lg:col-span-1 neo-card p-4 space-y-3 overflow-y-auto pb-20 lg:pb-4`}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white">Conversations</h2>
            <span className="text-xs text-text-muted">{conversations.length} chats</span>
          </div>
          {isLoading ? (
            <div className="text-xs text-text-muted text-center py-4">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="text-xs text-text-muted text-center py-4">No conversations yet</div>
          ) : (
            conversations.map((c) => {
              const sender = (c.sender as Record<string, unknown>) ?? {};
              const recipient = (c.recipient as Record<string, unknown>) ?? {};
              const isMeSender = String(sender._id ?? '') === String(user?._id ?? '');
              const otherUser = isMeSender ? recipient : sender;
              const uId = String(otherUser._id ?? '');
              const username = String(otherUser.username ?? 'User');
              const avatar = String(otherUser.avatar ?? '');

              if (!uId) return null;

              return (
                <Link
                  key={String(c._id ?? uId)}
                  href={`/messages/${uId}`}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    activeUserId === uId ? 'bg-blue-royal/20 border border-blue-electric' : 'hover:bg-white/5'
                  }`}
                >
                  {avatar ? (
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0">
                      <Image src={avatar} alt={username} fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center font-bold text-xs text-white shrink-0">
                      {username[0]?.toUpperCase() ?? 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{username}</h4>
                    <p className="text-[11px] text-text-muted truncate">{String(c.content ?? '')}</p>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Active Conversation Chat Window */}
        {activeUserId ? (
          <>
            {/* Mobile: fullscreen overlay above everything including bottom nav */}
            <div className="fixed inset-0 z-[60] bg-black-midnight lg:hidden flex flex-col" style={{ top: 0 }}>
              <ChatWindow recipientId={activeUserId} onBack={() => router.push('/messages')} />
            </div>
            {/* Desktop: inline */}
            <div className="hidden lg:block lg:col-span-2 h-full">
              <ChatWindow recipientId={activeUserId} onBack={() => router.push('/messages')} />
            </div>
          </>
        ) : (
          <div className="hidden lg:flex lg:col-span-2 h-full">
            <div className="glass-navy h-full w-full rounded-3xl flex items-center justify-center text-text-muted text-sm border border-white/5">
              Select a conversation to start chatting
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
