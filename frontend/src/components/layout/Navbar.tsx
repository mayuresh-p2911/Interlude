'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FilmIcon,
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi, friendsApi } from '@/lib/api';
import { getSocket } from '@/hooks/useSocket';
import { useUnreadStore } from '@/store/useUnreadStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const socket = getSocket();

  const {
    setUnreadNotifications,
    setPendingFriends,
    incrementUnreadMessages,
    incrementPendingFriends,
    incrementUnreadGroups,
    incrementUnreadNotifications,
    unreadNotificationsCount,
  } = useUnreadStore();

  const { data: notificationData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsApi.getAll(1),
    refetchInterval: 30000,
  });

  const apiUnreadCount = (notificationData?.data as { unread?: number })?.unread ?? 0;

  useEffect(() => {
    if (apiUnreadCount > 0) {
      setUnreadNotifications(apiUnreadCount);
    }
  }, [apiUnreadCount, setUnreadNotifications]);

  useEffect(() => {
    if (!user) return;
    friendsApi.getRequests().then((res) => {
      const requests = (res.data as unknown[]) ?? [];
      setPendingFriends(requests.length);
    }).catch(() => {});
  }, [user, setPendingFriends]);

  useEffect(() => {
    if (!socket) return;

    const handleDmReceive = (msg: { sender?: { _id?: string } }) => {
      if (!pathname.includes(msg?.sender?._id ?? '')) {
        incrementUnreadMessages();
      }
    };

    const handleFriendRequest = () => {
      incrementPendingFriends();
      toast('New friend request received!', { icon: '👥' });
    };

    const handleGroupMsg = () => {
      if (!pathname.startsWith('/groups')) {
        incrementUnreadGroups();
      }
    };

    const handleNotificationNew = () => {
      incrementUnreadNotifications();
    };

    socket.on('dm:receive', handleDmReceive);
    socket.on('friend:request', handleFriendRequest);
    socket.on('group:message:receive', handleGroupMsg);
    socket.on('notification:new', handleNotificationNew);

    return () => {
      socket.off('dm:receive', handleDmReceive);
      socket.off('friend:request', handleFriendRequest);
      socket.off('group:message:receive', handleGroupMsg);
      socket.off('notification:new', handleNotificationNew);
    };
  }, [socket, pathname, incrementUnreadMessages, incrementPendingFriends, incrementUnreadGroups, incrementUnreadNotifications]);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out successfully');
    router.push('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/home?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-white/5">
      <div className="h-full px-4 sm:px-6 flex items-center gap-2 sm:gap-4">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2 mr-2 sm:mr-4 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-royal to-blue-electric rounded-lg flex items-center justify-center shrink-0">
            <FilmIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-widest text-white hidden sm:block whitespace-nowrap">
            INTERLUDE
          </span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              id="navbar-search"
              type="search"
              placeholder="Search movies..."
              className="input-field pl-10 py-2.5 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Notifications */}
          <Link
            href="/notifications"
            id="navbar-notifications"
            className="relative p-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-all"
          >
            <BellIcon className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-electric rounded-full animate-pulse" />
            )}
          </Link>

          {/* User Menu */}
          <div className="relative">
            <button
              id="navbar-user-menu"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-all"
            >
              <div className="relative w-8 h-8">
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.username}
                    fill
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-royal to-blue-electric rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {user?.username?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-black-midnight rounded-full" />
              </div>
              <span className="text-sm font-medium text-text-secondary hidden md:block">
                {user?.username}
              </span>
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 glass-navy rounded-2xl border border-white/8 overflow-hidden shadow-glass"
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-medium text-white">{user?.username}</p>
                    <p className="text-xs text-text-muted truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      href={`/profile/${user?.username}`}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-all"
                    >
                      <UserCircleIcon className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-all"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                      Settings
                    </Link>
                    {user?.isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-blue-ice hover:bg-white/5 transition-all"
                      >
                        Admin Panel
                      </Link>
                    )}
                  </div>

                  <div className="py-1 border-t border-white/5">
                    <button
                      id="navbar-logout"
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-all w-full text-left"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
}
