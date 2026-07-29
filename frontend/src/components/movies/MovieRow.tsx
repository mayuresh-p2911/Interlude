'use client';

import { useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import MovieCardSkeleton from './MovieCardSkeleton';

interface MovieRowProps {
  title: string;
  children?: React.ReactNode;
  loading?: boolean;
  showProgress?: boolean;
}

export default function MovieRow({ title, children, loading }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative group">
      <h2 className="text-xl font-bold text-white mb-4 px-1 flex items-center justify-between">
        <span>{title}</span>
      </h2>

      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white/20 -ml-4"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={rowRef}
          className="flex gap-4 overflow-x-auto scroll-row pb-4 pt-1 px-1 scroll-smooth"
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <MovieCardSkeleton key={i} />)
            : children}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white/20 -mr-4"
        >
          <ChevronRightIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
