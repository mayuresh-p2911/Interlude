'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  HomeIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  FilmIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ChatBubbleLeftRightIcon as ChatIconSolid,
  BellIcon as BellIconSolid,
  FilmIcon as FilmIconSolid,
  UsersIcon as UsersIconSolid,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';

const navItems = [
  { href: '/home', label: 'Home', Icon: HomeIcon, IconActive: HomeIconSolid },
  { href: '/friends', label: 'Friends', Icon: UsersIcon, IconActive: UsersIconSolid },
  { href: '/groups', label: 'Groups', Icon: UserGroupIcon, IconActive: UserGroupIconSolid },
  { href: '/messages', label: 'Messages', Icon: ChatBubbleLeftRightIcon, IconActive: ChatIconSolid },
  { href: '/notifications', label: 'Notifications', Icon: BellIcon, IconActive: BellIconSolid },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-16 bottom-0 w-64 glass border-r border-white/5 py-6 px-4 overflow-y-auto">
        <nav className="space-y-1">
          {navItems.map(({ href, label, Icon, IconActive }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                id={`sidebar-${label.toLowerCase()}`}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden',
                  isActive
                    ? 'bg-gradient-to-r from-blue-royal/20 to-blue-electric/10 text-white border border-blue-electric/15'
                    : 'text-text-secondary hover:text-white hover:bg-white/5',
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-gradient-to-r from-blue-royal/20 to-transparent"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">
                  {isActive ? (
                    <IconActive className="w-5 h-5 text-blue-electric" />
                  ) : (
                    <Icon className="w-5 h-5 group-hover:text-blue-ice transition-colors" />
                  )}
                </span>
                <span className="relative z-10">{label}</span>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-electric rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Start Watching CTA */}
        <div className="mt-auto">
          <div className="neo-card p-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-royal to-blue-electric rounded-xl flex items-center justify-center mb-3 shadow-blue-glow">
              <FilmIconSolid className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium text-white mb-1">Ready to watch?</p>
            <p className="text-xs text-text-muted mb-3">Browse thousands of movies</p>
            <Link href="/home" className="btn-primary text-xs py-2 px-3 inline-block text-center w-full">
              Browse Movies
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5 pb-safe">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ href, label, Icon, IconActive }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-3 py-2"
              >
                {isActive ? (
                  <IconActive className="w-5 h-5 text-blue-electric" />
                ) : (
                  <Icon className="w-5 h-5 text-text-muted" />
                )}
                <span className={clsx('text-xs', isActive ? 'text-blue-electric' : 'text-text-muted')}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
