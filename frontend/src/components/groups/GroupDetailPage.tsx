'use client';

import { useQuery } from '@tanstack/react-query';
import { groupsApi } from '@/lib/api';
import ChatWindow from '@/components/watch/ChatWindow';
import VoiceChat from '@/components/watch/VoiceChat';
import { UserGroupIcon, FilmIcon } from '@heroicons/react/24/solid';

export default function GroupDetailPage({ groupId }: { groupId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.getGroup(groupId),
  });

  const group = (data?.data as Record<string, unknown>) ?? {};
  const members = (group.members as Record<string, unknown>[]) ?? [];
  const queue = (group.movieQueue as Record<string, unknown>[]) ?? [];

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="w-8 h-8 border-2 border-blue-electric/30 border-t-blue-electric rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-80px)]">
      {/* Left Column — Info & Queue */}
      <div className="space-y-6 overflow-y-auto">
        <div className="neo-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-royal to-blue-electric flex items-center justify-center font-bold text-white text-xl">
                {String(group.name ?? 'G')[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{String(group.name)}</h1>
                <p className="text-xs text-text-muted">{members.length} Members</p>
              </div>
            </div>
            <VoiceChat roomId={`group_${groupId}`} />
          </div>
          <p className="text-xs text-text-secondary">{String(group.description || 'No description.')}</p>
        </div>

        {/* Movie Queue */}
        <div className="neo-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FilmIcon className="w-4 h-4 text-blue-electric" /> Movie Queue ({queue.length})
          </h3>
          {queue.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">Queue is empty</p>
          ) : (
            queue.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs">
                <span className="font-bold text-white truncate">{String(item.title)}</span>
                <a href={`/movies/${item.movieId}`} className="text-blue-electric font-semibold hover:underline">
                  Watch
                </a>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column — Chat */}
      <div className="lg:col-span-2 h-full">
        <ChatWindow groupId={groupId} />
      </div>
    </div>
  );
}
