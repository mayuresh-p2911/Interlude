'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendsApi, usersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Image from 'next/image';
import {
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
} from '@heroicons/react/24/solid';
import Link from 'next/link';

export default function FriendsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'suggestions'>('friends');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendsApi.getFriends(),
  });

  const { data: requestsData } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: () => friendsApi.getRequests(),
  });

  const { data: sentRequestsData } = useQuery({
    queryKey: ['sent-friend-requests'],
    queryFn: () => friendsApi.getSentRequests(),
  });

  const { data: suggestionsData } = useQuery({
    queryKey: ['friend-suggestions'],
    queryFn: () => friendsApi.getSuggestions(),
  });

  const { data: searchData } = useQuery({
    queryKey: ['user-search', searchQuery],
    queryFn: () => usersApi.searchUsers(searchQuery),
    enabled: searchQuery.length > 2,
  });

  const friends = (friendsData?.data as Record<string, unknown>[]) ?? [];
  const requests = (requestsData?.data as Record<string, unknown>[]) ?? [];
  const sentRequests = (sentRequestsData?.data as Record<string, unknown>[]) ?? [];
  const suggestions = (suggestionsData?.data as Record<string, unknown>[]) ?? [];
  const searchResults = (searchData?.data as Record<string, unknown>[]) ?? [];

  const friendIds = new Set(friends.map((f) => String(f._id)));

  const incomingMap = new Map<string, string>();
  requests.forEach((r) => {
    const senderObj = r.sender as Record<string, unknown>;
    if (senderObj && senderObj._id) {
      incomingMap.set(String(senderObj._id), String(r._id));
    }
  });

  const sentSet = new Set<string>();
  sentRequests.forEach((sr) => {
    const receiverObj = sr.receiver as Record<string, unknown>;
    if (receiverObj && receiverObj._id) {
      sentSet.add(String(receiverObj._id));
    }
  });

  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => friendsApi.sendRequest(userId),
    onSuccess: () => {
      toast.success('Friend request sent!');
      queryClient.invalidateQueries({ queryKey: ['sent-friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friend-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-search'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to send request';
      toast.error(msg);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => friendsApi.acceptRequest(requestId),
    onSuccess: () => {
      toast.success('Friend request accepted');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['sent-friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friend-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['user-search'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (requestId: string) => friendsApi.declineRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['sent-friend-requests'] });
    },
  });

  const renderFriendButton = (userId: string) => {
    if (friendIds.has(userId)) {
      return (
        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
          <CheckIcon className="w-4 h-4" /> Added
        </span>
      );
    }

    if (sentSet.has(userId)) {
      return (
        <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1.5">
          <ClockIcon className="w-4 h-4" /> Pending
        </span>
      );
    }

    if (incomingMap.has(userId)) {
      const requestId = incomingMap.get(userId)!;
      return (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); acceptMutation.mutate(requestId); }}
          className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
        >
          <CheckIcon className="w-4 h-4" /> Accept
        </button>
      );
    }

    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendRequestMutation.mutate(userId); }}
        disabled={sendRequestMutation.isPending}
        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
      >
        <UserPlusIcon className="w-4 h-4" /> Add Friend
      </button>
    );
  };

  const renderAvatar = (userData: Record<string, unknown>) => {
    const avatar = String(userData.avatar ?? '');
    const name = String(userData.username ?? 'U');
    return avatar ? (
      <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10">
        <Image src={avatar} alt={name} fill className="object-cover" unoptimized />
      </div>
    ) : (
      <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center font-bold text-white shrink-0">
        {name[0]?.toUpperCase()}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-20 lg:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">Friends</h1>
          <p className="text-text-secondary text-sm">Stay connected with your watching crew</p>
        </div>

        <input
          type="text"
          placeholder="Find users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field max-w-xs text-sm"
        />
      </div>

      {searchQuery.length > 2 && (
        <div className="neo-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-text-muted">Search Results</h3>
          {searchResults.length === 0 ? (
            <p className="text-xs text-text-muted">No users found</p>
          ) : (
            searchResults.map((u) => (
              <Link
                key={String(u._id)}
                href={`/profile/${String(u.username)}`}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  {renderAvatar(u)}
                  <span className="text-sm font-bold text-white">{String(u.username)}</span>
                </div>
                {renderFriendButton(String(u._id))}
              </Link>
            ))
          )}
        </div>
      )}

      <div className="flex gap-2 sm:gap-4 border-b border-white/5 pb-4 overflow-x-auto">
        {(['friends', 'requests', 'suggestions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-blue-royal text-white shadow-blue-glow'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            {tab} {tab === 'requests' && requests.length > 0 && `(${requests.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'friends' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {friends.length === 0 ? (
            <div className="col-span-full py-12 text-center text-text-muted">
              No friends yet. Check out suggestions!
            </div>
          ) : (
            friends.map((f) => (
              <div key={String(f._id)} className="neo-card p-4 flex items-center justify-between">
                <Link href={`/profile/${String(f.username)}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden border border-white/10">
                    {f.avatar ? (
                      <Image src={String(f.avatar)} alt={String(f.username)} fill className="object-cover" unoptimized />
                    ) : (
                      String(f.username ?? 'U')[0].toUpperCase()
                    )}
                    {f.onlineStatus === 'online' && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black z-10" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{String(f.username)}</h4>
                    <p className="text-xs text-text-muted capitalize">{String(f.onlineStatus ?? 'offline')}</p>
                  </div>
                </Link>

                <Link
                  href={`/messages/${String(f._id)}`}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-blue-ice shrink-0 ml-2"
                >
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <p className="text-text-muted text-sm py-8 text-center">No pending friend requests</p>
          ) : (
            requests.map((r) => {
              const sender = (r.sender as Record<string, unknown>) ?? {};
              return (
                <div key={String(r._id)} className="neo-card p-4 flex items-center justify-between gap-3">
                  <Link href={`/profile/${String(sender.username)}`} className="flex items-center gap-3 flex-1 min-w-0">
                    {renderAvatar(sender)}
                    <span className="text-sm font-bold text-white truncate">{String(sender.username)}</span>
                  </Link>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => acceptMutation.mutate(String(r._id))}
                      className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                    >
                      <CheckIcon className="w-4 h-4" /> Accept
                    </button>
                    <button
                      onClick={() => declineMutation.mutate(String(r._id))}
                      className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1"
                    >
                      <XMarkIcon className="w-4 h-4" /> Decline
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestions.map((s) => (
            <div key={String(s._id)} className="neo-card p-4 flex items-center justify-between gap-3">
              <Link href={`/profile/${String(s.username)}`} className="flex items-center gap-3 flex-1 min-w-0">
                {renderAvatar(s)}
                <span className="text-sm font-bold text-white truncate">{String(s.username)}</span>
              </Link>
              {renderFriendButton(String(s._id))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
