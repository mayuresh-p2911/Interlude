'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { PlayIcon, UserGroupIcon, StarIcon } from '@heroicons/react/24/solid';
import { PlusIcon } from '@heroicons/react/24/outline';
import { usersApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface MovieCardProps {
  movie: Record<string, unknown>;
  size?: 'sm' | 'md' | 'lg';
}

export default function MovieCard({ movie, size = 'md' }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [addingToList, setAddingToList] = useState(false);

  const movieId = String(movie._id ?? movie.providerId ?? '');
  const title = String(movie.title ?? '');
  const poster = String(movie.poster ?? '');
  const year = movie.year ? String(movie.year) : '';
  const rating = movie.rating ? Number(movie.rating).toFixed(1) : '';
  const genres = (movie.genres as string[]) ?? [];

  const sizeClasses = {
    sm: 'w-32',
    md: 'w-44',
    lg: 'w-56',
  };

  const handleAddToWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingToList(true);
    try {
      await usersApi.addToWatchlist(movieId);
      toast.success(`Added "${title}" to watchlist`);
    } catch {
      toast.error('Already in watchlist');
    } finally {
      setAddingToList(false);
    }
  };

  return (
    <Link href={`/movies/${movieId}`} className={`${sizeClasses[size]} flex-shrink-0`}>
      <motion.div
        className="relative aspect-movie rounded-2xl overflow-hidden neo-card group cursor-pointer"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Poster */}
        <div className="absolute inset-0 bg-surface-2">
          {poster ? (
            <Image
              src={poster}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 40vw, 200px"
              unoptimized={poster.includes('archive.org')}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-3">
              <span className="text-text-muted text-xs text-center px-2">{title}</span>
            </div>
          )}
        </div>

        {/* Hover Overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black-midnight via-black-midnight/60 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />

        {/* Rating badge */}
        {rating && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg glass text-xs font-medium text-white">
            <StarIcon className="w-3 h-3 text-yellow-400" />
            {rating}
          </div>
        )}

        {/* Hover Content */}
        <motion.div
          className="absolute inset-x-0 bottom-0 p-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-white text-xs font-bold truncate mb-1">{title}</p>
          {year && <p className="text-text-muted text-xs mb-2">{year}</p>}
          {genres.length > 0 && (
            <p className="text-blue-ice text-xs mb-3 truncate">{genres.slice(0, 2).join(' · ')}</p>
          )}

          <div className="flex gap-1.5">
            <button
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-blue-royal hover:bg-blue-electric transition-colors text-white text-xs font-medium"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = `/movies/${movieId}`;
              }}
            >
              <PlayIcon className="w-3 h-3" />
              Play
            </button>
            <button
              className="flex items-center justify-center w-8 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = `/movies/${movieId}?action=watch-together`;
              }}
              title="Watch Together"
            >
              <UserGroupIcon className="w-3.5 h-3.5" />
            </button>
            <button
              className="flex items-center justify-center w-8 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
              onClick={handleAddToWatchlist}
              disabled={addingToList}
              title="Add to Watchlist"
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>

        {/* Blue glow on hover */}
        <motion.div
          className="absolute inset-0 rounded-2xl ring-2 ring-blue-electric/0"
          animate={{ 
            boxShadow: isHovered ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : '0 0 0 0 rgba(59, 130, 246, 0)' 
          }}
          transition={{ duration: 0.2 }}
        />
      </motion.div>

      {/* Title below card */}
      <p className="mt-2 text-xs text-text-secondary truncate px-1 group-hover:text-white transition-colors">
        {title}
      </p>
    </Link>
  );
}
