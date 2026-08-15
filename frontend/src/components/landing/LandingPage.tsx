'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FilmIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon,
  PlayIcon,
  UserPlusIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';

import { useAuthStore } from '@/store/authStore';

const features = [
  {
    icon: UserPlusIcon,
    title: 'Friend System',
    description:
      'Build your inner circle. Send friend requests, see who is online, and stay connected with the people who matter.',
    gradient: 'from-blue-royal to-blue-electric',
  },
  {
    icon: UserGroupIcon,
    title: 'Private Groups',
    description:
      'Create your own movie club. Invite friends, build a shared movie queue, and host watch parties anytime.',
    gradient: 'from-blue-electric to-blue-ice',
  },
  {
    icon: PlayIcon,
    title: 'Watch Together',
    description:
      'Perfectly synchronized playback across all devices. Play, pause, seek — everyone stays in perfect lock-step.',
    gradient: 'from-navy-mid to-blue-royal',
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'Live Chat',
    description:
      'React in real-time. Send messages, share reactions, and live-comment during every movie moment.',
    gradient: 'from-blue-royal to-blue-electric',
  },
  {
    icon: SpeakerWaveIcon,
    title: 'Voice Chat',
    description:
      'Crystal-clear in-session voice chat powered by WebRTC. No third-party apps needed — just press join.',
    gradient: 'from-blue-electric to-blue-ice',
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Cross-Device',
    description:
      'Seamlessly switch from desktop to mobile. INTERLUDE looks and feels premium on every screen size.',
    gradient: 'from-navy-deep to-blue-royal',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-black-midnight overflow-hidden">
      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 sm:gap-3 shrink-0"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-royal to-blue-electric rounded-lg flex items-center justify-center shrink-0">
              <FilmIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-base sm:text-xl font-bold tracking-widest text-white whitespace-nowrap">INTERLUDE</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2.5 sm:gap-4 shrink-0"
          >
            {isAuthenticated ? (
              <Link href="/home" className="btn-primary text-xs sm:text-sm py-2 px-3.5 sm:py-2.5 sm:px-5 whitespace-nowrap shrink-0">
                Go to Dashboard 🎬
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-text-secondary hover:text-white transition-colors duration-200 text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  Sign In
                </Link>
                <Link href="/auth/register" className="btn-primary text-xs sm:text-sm py-2 px-3.5 sm:py-2.5 sm:px-5 whitespace-nowrap shrink-0">
                  Get Started
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Cinematic background */}
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0 bg-gradient-radial from-blue-royal/10 via-transparent to-transparent" />

        {/* Animated orbs */}
        <motion.div
          className="absolute top-20 left-1/4 w-96 h-96 bg-blue-royal/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-20 right-1/4 w-80 h-80 bg-blue-electric/15 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Film strip decoration */}
        <div className="absolute left-0 top-0 bottom-0 w-8 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="border border-white/20 h-12 mx-1 mb-1 rounded-sm"
            />
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="border border-white/20 h-12 mx-1 mb-1 rounded-sm"
            />
          ))}
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-blue-electric/20 text-blue-ice text-sm font-medium mb-8"
          >
            <span className="w-2 h-2 bg-blue-electric rounded-full animate-pulse" />
            Now streaming — free forever
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl md:text-8xl font-black leading-none tracking-tight text-white mb-6"
          >
            Watch{' '}
            <span className="text-gradient-blue">Together.</span>
            <br />
            Stay{' '}
            <span className="text-gradient-blue">Together.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            The premium social movie platform. Watch in perfect sync, chat live, voice
            call your crew, and discover movies together — not alone.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/auth/register"
              id="cta-get-started"
              className="btn-primary text-lg py-4 px-8 inline-flex items-center gap-2 justify-center"
            >
              <PlayIcon className="w-5 h-5" />
              Start Watching Free
            </Link>
            <Link
              href="/auth/login"
              id="cta-signin"
              className="btn-ghost text-lg py-4 px-8 inline-flex items-center gap-2 justify-center"
            >
              Sign In
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 text-text-muted text-sm"
          >
            No credit card required · Free forever · Thousands of movies
          </motion.p>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-3 bg-blue-electric rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-7xl mx-auto" id="features">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
            Built for{' '}
            <span className="text-gradient-blue">movie lovers</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Every feature designed around the experience of watching movies together —
            not sharing them.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -6 }}
              className="neo-card p-8 group cursor-default"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-blue-glow group-hover:shadow-blue-glow-lg transition-shadow duration-300`}
              >
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-text-secondary leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="py-32 px-6 bg-gradient-to-b from-transparent to-navy-deep/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-black text-white mb-6">
              Your movie night,{' '}
              <span className="text-gradient-blue">reimagined</span>
            </h2>
            <p className="text-xl text-text-secondary">Three steps to your perfect watch party</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Pick a Movie', desc: 'Browse thousands of films. Find something everyone will love.' },
              { step: '02', title: 'Invite Friends', desc: 'Send an invite link. Friends join with one click — no sign-up needed for guests.' },
              { step: '03', title: 'Watch Together', desc: 'Perfectly synchronized playback. Chat, react, and voice chat in real-time.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-royal to-blue-electric flex items-center justify-center mx-auto mb-6 shadow-blue-glow">
                  <span className="text-xl font-black text-white">{item.step}</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-text-secondary leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="neo-card p-16 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-radial from-blue-royal/15 via-transparent to-transparent" />
            <div className="relative z-10">
              <h2 className="text-5xl font-black text-white mb-6">
                Ready to watch{' '}
                <span className="text-gradient-blue">together?</span>
              </h2>
              <p className="text-xl text-text-secondary mb-10 max-w-lg mx-auto">
                Join INTERLUDE today. Free forever. No credit card required.
              </p>
              <Link
                href="/auth/register"
                id="cta-bottom-register"
                className="btn-primary text-lg py-5 px-12 inline-flex items-center gap-2"
              >
                <PlayIcon className="w-5 h-5" />
                Get Started — It's Free
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-royal to-blue-electric rounded-lg flex items-center justify-center">
                <FilmIcon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-widest text-white">INTERLUDE</span>
            </div>

            <div className="flex items-center gap-8 text-sm text-text-muted">
              <Link href="#features" className="hover:text-white transition-colors">
                Features
              </Link>
              <Link href="/auth/register" className="hover:text-white transition-colors">
                Get Started
              </Link>
              <Link href="/auth/login" className="hover:text-white transition-colors">
                Sign In
              </Link>
            </div>

            <p className="text-text-muted text-sm">
              © {new Date().getFullYear()} INTERLUDE. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
