'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { PlayIcon, UserGroupIcon, PlusIcon, StarIcon, ShareIcon } from '@heroicons/react/24/solid';
import { moviesApi, sessionsApi, usersApi, friendsApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function MovieDetailPage({ movieId }: { movieId: string }) {
  const router = useRouter();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [creatingSession, setCreatingSession] = useState(false);

  const { data: movieData, isLoading } = useQuery({
    queryKey: ['movie', movieId],
    queryFn: () => moviesApi.getMovie(movieId),
  });

  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendsApi.getFriends(),
  });

  const movie = (movieData?.data as Record<string, unknown>) ?? {};
  const friends = (friendsData?.data as Record<string, unknown>[]) ?? [];

  const handleStartWatchTogether = async () => {
    setCreatingSession(true);
    try {
      const res = await sessionsApi.create(movieId, true);
      const session = res.data as { _id: string };

      if (selectedFriends.length > 0) {
        await sessionsApi.invite(session._id, selectedFriends);
      }

      toast.success('Watch session created!');
      router.push(`/watch/${session._id}`);
    } catch {
      toast.error('Failed to create watch session');
    } finally {
      setCreatingSession(false);
    }
  };

  const handleAddToWatchlist = async () => {
    try {
      await usersApi.addToWatchlist(movieId);
      toast.success('Added to watchlist');
    } catch {
      toast.error('Already in watchlist');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="w-10 h-10 border-2 border-blue-electric/30 border-t-blue-electric rounded-full animate-spin" />
      </div>
    );
  }

  const title = String(movie.title ?? 'Untitled Movie');
  const description = String(movie.description ?? 'No synopsis available.');
  const backdrop = String(movie.backdrop ?? movie.poster ?? '');
  const poster = String(movie.poster ?? '');
  const year = movie.year ? String(movie.year) : '';
  const runtime = movie.runtime ? `${movie.runtime} min` : '';
  const rating = movie.rating ? Number(movie.rating).toFixed(1) : '';
  const genres = (movie.genres as string[]) ?? [];
  const cast = (movie.cast as string[]) ?? [];

  return (
    <div className="min-h-screen pb-24">
      {/* Backdrop Header */}
      <div className="relative h-[65vh] min-h-[450px]">
        {backdrop ? (
          <Image
            src={backdrop}
            alt={title}
            fill
            className="object-cover"
            unoptimized={backdrop.includes('archive.org')}
          />
        ) : (
          <div className="w-full h-full bg-surface-2" />
        )}
        <div className="absolute inset-0 bg-cinema-overlay" />
        <div className="absolute inset-0 bg-gradient-to-r from-black-midnight via-black-midnight/70 to-transparent" />

        <div className="absolute inset-0 flex items-end pb-12 px-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-end">
            {/* Poster Card */}
            {poster && (
              <div className="relative w-48 h-72 rounded-2xl overflow-hidden neo-card hidden md:block flex-shrink-0">
                <Image
                  src={poster}
                  alt={title}
                  fill
                  className="object-cover"
                  unoptimized={poster.includes('archive.org')}
                />
              </div>
            )}

            {/* Info & Actions */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {rating && (
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full glass text-sm font-semibold text-yellow-400">
                    <StarIcon className="w-4 h-4" /> {rating}
                  </span>
                )}
                {year && <span className="text-text-secondary text-sm font-medium">{year}</span>}
                {runtime && <span className="text-text-secondary text-sm font-medium">{runtime}</span>}
                {genres.map((g) => (
                  <span key={g} className="px-3 py-1 rounded-full bg-blue-royal/20 text-blue-ice text-xs font-semibold">
                    {g}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">{title}</h1>

              <div className="flex flex-wrap gap-4 mt-6">
                <button
                  onClick={async () => {
                    const res = await sessionsApi.create(movieId, false);
                    const session = res.data as { _id: string };
                    router.push(`/watch/${session._id}`);
                  }}
                  className="btn-primary py-4 px-8 text-base flex items-center gap-2"
                >
                  <PlayIcon className="w-5 h-5" />
                  Play Solo
                </button>

                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn-ghost py-4 px-8 text-base flex items-center gap-2 border-blue-electric/40 text-blue-ice hover:bg-blue-electric/10"
                >
                  <UserGroupIcon className="w-5 h-5" />
                  Watch Together
                </button>

                <button
                  onClick={handleAddToWatchlist}
                  className="btn-ghost py-4 px-4 text-base"
                  title="Add to Watchlist"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-3">Synopsis</h2>
            <p className="text-text-secondary leading-relaxed text-base">{description}</p>
          </div>

          {cast.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-3">Cast & Crew</h2>
              <div className="flex flex-wrap gap-2">
                {cast.map((person) => (
                  <span key={person} className="px-4 py-2 rounded-xl neo-card text-sm text-text-secondary">
                    {person}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md glass-navy p-6 rounded-3xl border border-white/10"
          >
            <h3 className="text-2xl font-bold text-white mb-2">Create Watch Party</h3>
            <p className="text-text-secondary text-sm mb-6">Select friends to invite to watch {title}</p>

            <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
              {friends.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">No friends added yet</p>
              ) : (
                friends.map((friend) => {
                  const fId = String(friend._id);
                  const isSelected = selectedFriends.includes(fId);
                  return (
                    <div
                      key={fId}
                      onClick={() =>
                        setSelectedFriends(
                          isSelected ? selectedFriends.filter((id) => id !== fId) : [...selectedFriends, fId],
                        )
                      }
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        isSelected ? 'bg-blue-royal/30 border border-blue-electric' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center font-bold text-xs text-white">
                        {String(friend.username ?? 'U')[0].toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-medium">{String(friend.username)}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowInviteModal(false)} className="btn-ghost flex-1 py-3">
                Cancel
              </button>
              <button
                onClick={handleStartWatchTogether}
                disabled={creatingSession}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
              >
                <UserGroupIcon className="w-4 h-4" />
                Start Party
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
