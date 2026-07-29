'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendsApi, usersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { UserPlusIcon, CheckIcon, XMarkIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

export default function FriendsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'suggestions'>('friends');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: friendsData, isLoading: loadingFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendsApi.getFriends(),
  });

  const { data: requestsData } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: () => friendsApi.getRequests(),
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
  const suggestions = (suggestionsData?.data as Record<string, unknown>[]) ?? [];
  const searchResults = (searchData?.data as Record<string, unknown>[]) ?? [];

  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => friendsApi.sendRequest(userId),
    onSuccess: () => {
      toast.success('Friend request sent!');
      queryClient.invalidateQueries({ queryKey: ['friend-suggestions'] });
    },
    onError: () => toast.error('Failed to send request'),
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => friendsApi.acceptRequest(requestId),
    onSuccess: () => {
      toast.success('Friend request accepted');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (requestId: string) => friendsApi.declineRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Friends</h1>
          <p className="text-text-secondary text-sm">Stay connected with your watching crew</p>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Find users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field max-w-xs text-sm"
        />
      </div>

      {/* Search overlay if typing */}
      {searchQuery.length > 2 && (
        <div className="neo-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-text-muted">Search Results</h3>
          {searchResults.length === 0 ? (
            <p className="text-xs text-text-muted">No users found</p>
          ) : (
            searchResults.map((u) => (
              <div key={String(u._id)} className="flex items-center justify-between p-2">
                <span className="text-sm font-bold text-white">{String(u.username)}</span>
                <button
                  onClick={() => sendRequestMutation.mutate(String(u._id))}
                  className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
                >
                  <UserPlusIcon className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5 pb-4">
        {(['friends', 'requests', 'suggestions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
              activeTab === tab
                ? 'bg-blue-royal text-white shadow-blue-glow'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            {tab} {tab === 'requests' && requests.length > 0 && `(${requests.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'friends' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {friends.length === 0 ? (
            <div className="col-span-full py-12 text-center text-text-muted">
              No friends yet. Check out suggestions!
            </div>
          ) : (
            friends.map((f) => (
              <div key={String(f._id)} className="neo-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center font-bold text-white relative">
                    {String(f.username ?? 'U')[0].toUpperCase()}
                    {f.onlineStatus === 'online' && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{String(f.username)}</h4>
                    <p className="text-xs text-text-muted capitalize">{String(f.onlineStatus ?? 'offline')}</p>
                  </div>
                </div>

                <Link
                  href={`/messages/${String(f._id)}`}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-blue-ice"
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
                <div key={String(r._id)} className="neo-card p-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{String(sender.username)}</span>
                  <div className="flex gap-2">
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
            <div key={String(s._id)} className="neo-card p-4 flex items-center justify-between">
              <span className="text-sm font-bold text-white">{String(s.username)}</span>
              <button
                onClick={() => sendRequestMutation.mutate(String(s._id))}
                className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
              >
                <UserPlusIcon className="w-4 h-4" /> Add Friend
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
