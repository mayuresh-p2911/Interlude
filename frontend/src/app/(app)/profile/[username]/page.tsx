'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, friendsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import {
  Cog6ToothIcon,
  UserGroupIcon,
  ClockIcon,
  FilmIcon,
  SparklesIcon,
  CalendarIcon,
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

function ProfileFriendButton({ targetUserId }: { targetUserId: string }) {
  const queryClient = useQueryClient();

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

  const friends = (friendsData?.data as Record<string, unknown>[]) ?? [];
  const requests = (requestsData?.data as Record<string, unknown>[]) ?? [];
  const sentRequests = (sentRequestsData?.data as Record<string, unknown>[]) ?? [];

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
    },
  });

  if (!targetUserId) return null;

  if (friendIds.has(targetUserId)) {
    return (
      <span className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 shrink-0 self-center md:self-start">
        <CheckIcon className="w-4 h-4" /> Added
      </span>
    );
  }

  if (sentSet.has(targetUserId)) {
    return (
      <span className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1.5 shrink-0 self-center md:self-start">
        <ClockIcon className="w-4 h-4" /> Pending
      </span>
    );
  }

  if (incomingMap.has(targetUserId)) {
    const requestId = incomingMap.get(targetUserId)!;
    return (
      <button
        onClick={() => acceptMutation.mutate(requestId)}
        className="btn-primary text-xs py-2.5 px-4 flex items-center gap-2 shrink-0 self-center md:self-start"
      >
        <CheckIcon className="w-4 h-4" /> Accept Request
      </button>
    );
  }

  return (
    <button
      onClick={() => sendRequestMutation.mutate(targetUserId)}
      disabled={sendRequestMutation.isPending}
      className="btn-primary text-xs py-2.5 px-4 flex items-center gap-2 shrink-0 self-center md:self-start"
    >
      <UserPlusIcon className="w-4 h-4" /> Add Friend
    </button>
  );
}

export default function ProfilePage({ params }: { params: { username: string } }) {
  const { user: currentUser } = useAuthStore();
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [userFriends, setUserFriends] = useState<Record<string, unknown>[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['profile', params.username],
    queryFn: () => usersApi.getProfile(params.username),
  });

  const profile = (data?.data as Record<string, unknown>) ?? {};

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="w-8 h-8 border-2 border-blue-electric/30 border-t-blue-electric rounded-full animate-spin" />
      </div>
    );
  }

  const isOwnProfile = currentUser?.username === params.username;

  const username = String(profile.username ?? params.username);
  const pronouns = profile.pronouns ? String(profile.pronouns) : '';
  const bio = String(profile.bio || 'No bio yet.');
  const avatar = String(profile.avatar ?? '');
  const customStatus = profile.customStatus ? String(profile.customStatus) : null;
  const friendsCount = profile.friendsCount !== null && profile.friendsCount !== undefined ? Number(profile.friendsCount) : null;
  const lastSeen = profile.lastSeen ? new Date(String(profile.lastSeen)).toLocaleString() : null;
  const onlineStatus = String(profile.onlineStatus ?? 'offline');
  const currentActivity = profile.currentActivity as { type?: string; movieTitle?: string } | null;
  const joinedAt = profile.joinedAt ? new Date(String(profile.joinedAt)).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  const handleOpenFriends = async () => {
    if (friendsCount === null) return;
    setShowFriendsModal(true);
    setLoadingFriends(true);
    try {
      const res = await usersApi.getUserFriends(username);
      setUserFriends((res.data as Record<string, unknown>[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFriends(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header Card */}
      <div className="neo-card p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-surface-3 flex items-center justify-center font-black text-4xl text-white shrink-0 border-2 border-blue-electric/20 shadow-glass">
            {avatar ? (
              <Image src={avatar} alt={username} fill className="object-cover" unoptimized />
            ) : (
              username[0]?.toUpperCase()
            )}
            {onlineStatus === 'online' && (
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black-midnight" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{username}</h1>
              {pronouns && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-text-muted text-xs font-semibold">
                  ({pronouns})
                </span>
              )}
            </div>

            {/* Custom Status */}
            {customStatus && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-royal/20 border border-blue-electric/30 text-blue-ice text-xs font-medium">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>{customStatus}</span>
              </div>
            )}

            <p className="text-text-secondary text-sm max-w-md">{bio}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-text-muted pt-1">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4 text-blue-electric" /> Member since {joinedAt}
              </span>
              {lastSeen && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4 text-blue-electric" /> Last active: {lastSeen}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button: Edit Profile (Own Profile) or Add Friend / Pending / Added (Other User Profile) */}
        {isOwnProfile ? (
          <Link
            href="/settings"
            className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-2 shrink-0 self-center md:self-start"
          >
            <Cog6ToothIcon className="w-4 h-4" /> Edit Profile
          </Link>
        ) : (
          <ProfileFriendButton targetUserId={String(profile._id ?? '')} />
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Friends Info Card */}
        <div
          onClick={handleOpenFriends}
          className={`neo-card p-6 space-y-3 transition-all ${
            friendsCount !== null ? 'cursor-pointer hover:border-blue-electric/40 hover:scale-[1.01]' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <UserGroupIcon className="w-5 h-5 text-blue-electric" />
              <span>Friends</span>
            </div>
            {friendsCount !== null && (
              <span className="text-xs text-blue-electric font-semibold hover:underline">View All →</span>
            )}
          </div>
          {friendsCount !== null ? (
            <p className="text-2xl font-black text-white">
              {friendsCount} <span className="text-xs font-normal text-text-muted">Friends</span>
            </p>
          ) : (
            <p className="text-xs text-text-muted italic">Friend list is private</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="neo-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <FilmIcon className="w-5 h-5 text-blue-electric" />
            <span>Recent Activity</span>
          </div>
          {currentActivity?.movieTitle ? (
            <div className="flex items-center gap-2 text-sm text-blue-ice">
              <span className="w-2 h-2 rounded-full bg-blue-electric animate-pulse" />
              <span>Currently {currentActivity.type === 'watching' ? 'watching' : 'in session'}: <strong>{currentActivity.movieTitle}</strong></span>
            </div>
          ) : (
            <p className="text-xs text-text-muted italic">No recent activity or activity hidden</p>
          )}
        </div>
      </div>

      {/* Friends List Modal */}
      <AnimatePresence>
        {showFriendsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#081020] rounded-3xl border border-white/10 p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-blue-electric" />
                  {username}'s Friends ({userFriends.length})
                </h3>
                <button
                  onClick={() => setShowFriendsModal(false)}
                  className="p-1 rounded-xl hover:bg-white/10 text-text-muted hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                {loadingFriends ? (
                  <div className="py-8 text-center text-text-muted text-sm animate-pulse">Loading friends...</div>
                ) : userFriends.length === 0 ? (
                  <div className="py-8 text-center text-text-muted text-sm">No friends to show</div>
                ) : (
                  userFriends.map((f) => {
                    const friendUsername = String(f.username ?? '');
                    const friendAvatar = f.avatar ? String(f.avatar) : '';
                    const friendStatus = String(f.onlineStatus ?? 'offline');
                    return (
                      <Link
                        key={String(f._id)}
                        href={`/profile/${friendUsername}`}
                        onClick={() => setShowFriendsModal(false)}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          {friendAvatar ? (
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10">
                              <Image src={friendAvatar} alt={friendUsername} fill className="object-cover" unoptimized />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-royal/30 border border-blue-electric/20 flex items-center justify-center font-bold text-sm text-white">
                              {friendUsername[0]?.toUpperCase() ?? 'U'}
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-bold text-white hover:underline">{friendUsername}</h4>
                            <p className="text-xs text-text-muted capitalize">{friendStatus}</p>
                          </div>
                        </div>
                        <span className="text-xs text-blue-ice hover:text-white font-medium">View Profile →</span>
                      </Link>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
