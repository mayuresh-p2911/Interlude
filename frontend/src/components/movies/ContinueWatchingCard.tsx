'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PlayIcon } from '@heroicons/react/24/solid';

interface ContinueWatchingProps {
  item: Record<string, unknown>;
}

export default function ContinueWatchingCard({ item }: ContinueWatchingProps) {
  const movie = (item.movie as Record<string, unknown>) ?? {};
  const movieId = String(movie._id ?? movie.providerId ?? '');
  const title = String(movie.title ?? '');
  const poster = String(movie.poster ?? '');
  const progress = Number(item.progress ?? 0);
  const runtime = Number(movie.runtime ?? 120);

  const percentage = Math.min(100, Math.max(0, (progress / (runtime * 60)) * 100));

  return (
    <Link href={`/movies/${movieId}?t=${Math.floor(progress)}`} className="w-64 flex-shrink-0">
      <div className="relative aspect-video rounded-2xl overflow-hidden neo-card group cursor-pointer">
        {poster ? (
          <Image
            src={poster}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized={poster.includes('archive.org')}
          />
        ) : (
          <div className="w-full h-full bg-surface-3 flex items-center justify-center text-xs text-text-muted">
            {title}
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-blue-royal/90 group-hover:bg-blue-electric flex items-center justify-center text-white shadow-blue-glow transition-all">
            <PlayIcon className="w-6 h-6 ml-0.5" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/60">
          <div
            className="h-full bg-gradient-to-r from-blue-royal to-blue-electric"
            style={{ width: `${percentage || 15}%` }}
          />
        </div>
      </div>

      <p className="mt-2 text-sm font-semibold text-white truncate">{title}</p>
      <p className="text-xs text-text-muted">Resume watching</p>
    </Link>
  );
}
