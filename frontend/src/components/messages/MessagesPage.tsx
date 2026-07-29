'use client';

import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/lib/api';
import Link from 'next/link';
import ChatWindow from '@/components/watch/ChatWindow';

export default function MessagesPage({ activeUserId }: { activeUserId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.getConversations(),
  });

  const conversations = (data?.data as Record<string, unknown>[]) ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-80px)]">
      {/* Conversations List */}
      <div className="neo-card p-4 space-y-3 overflow-y-auto">
        <h2 className="text-lg font-bold text-white mb-2">Conversations</h2>
        {isLoading ? (
          <div className="text-xs text-text-muted text-center py-4">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="text-xs text-text-muted text-center py-4">No conversations yet</div>
        ) : (
          conversations.map((c) => {
            const sender = (c.sender as Record<string, unknown>) ?? {};
            const recipient = (c.recipient as Record<string, unknown>) ?? {};
            const otherUser = sender._id === activeUserId ? recipient : sender;
            const uId = String(otherUser._id ?? '');
            const username = String(otherUser.username ?? 'User');

            return (
              <Link
                key={String(c._id)}
                href={`/messages/${uId}`}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  activeUserId === uId ? 'bg-blue-royal/20 border border-blue-electric' : 'hover:bg-white/5'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center font-bold text-xs text-white">
                  {username[0].toUpperCase()}
                </div>
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
      <div className="lg:col-span-2 h-full">
        {activeUserId ? (
          <ChatWindow recipientId={activeUserId} />
        ) : (
          <div className="glass-navy h-full rounded-3xl flex items-center justify-center text-text-muted text-sm">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
