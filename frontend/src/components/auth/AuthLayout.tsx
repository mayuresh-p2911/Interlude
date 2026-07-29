'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FilmIcon } from '@heroicons/react/24/outline';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black-midnight flex">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-navy-deep via-navy-mid to-black-midnight items-center justify-center overflow-hidden">
        {/* Background orbs */}
        <motion.div
          className="absolute top-20 left-20 w-72 h-72 bg-blue-royal/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-56 h-56 bg-blue-electric/15 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 7, repeat: Infinity }}
        />

        <div className="relative z-10 text-center px-12">
          <Link href="/" className="flex items-center gap-3 justify-center mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-royal to-blue-electric rounded-2xl flex items-center justify-center shadow-blue-glow">
              <FilmIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-black tracking-widest text-white">INTERLUDE</span>
          </Link>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black text-white leading-tight mb-6"
          >
            Watch <span className="text-gradient-blue">Together.</span>
            <br />
            Stay <span className="text-gradient-blue">Together.</span>
          </motion.h2>

          <p className="text-text-secondary text-lg leading-relaxed">
            The social streaming platform where movies bring people closer.
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            {['Synchronized Playback', 'Live Chat', 'Voice Chat', 'Private Groups'].map((f) => (
              <span
                key={f}
                className="px-4 py-2 rounded-full glass border border-blue-electric/15 text-blue-ice text-sm"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 justify-center mb-10 lg:hidden">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-royal to-blue-electric rounded-xl flex items-center justify-center">
              <FilmIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-widest text-white">INTERLUDE</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
