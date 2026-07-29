'use client';

import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import Image from 'next/image';

export default function ProfilePage({ params }: { params: { username: string } }) {
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

  const username = String(profile.username ?? params.username);
  const bio = String(profile.bio || 'No bio yet.');
  const avatar = String(profile.avatar ?? '');
  const joinedAt = profile.joinedAt ? new Date(String(profile.joinedAt)).toLocaleDateString() : '';

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header Card */}
      <div className="neo-card p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-surface-3 flex items-center justify-center font-black text-3xl text-white">
          {avatar ? (
            <Image src={avatar} alt={username} fill className="object-cover" />
          ) : (
            username[0]?.toUpperCase()
          )}
        </div>

        <div className="text-center md:text-left space-y-2">
          <h1 className="text-3xl font-black text-white">{username}</h1>
          <p className="text-text-secondary text-sm max-w-md">{bio}</p>
          <p className="text-xs text-text-muted">Member since {joinedAt}</p>
        </div>
      </div>
    </div>
  );
}
