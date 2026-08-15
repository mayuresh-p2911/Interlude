'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useSocket } from '@/hooks/useSocket';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing, initializeAuth } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();
  const { isConnected } = useSocket();

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        setIsHydrated(true);
      });
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    initializeAuth();
  }, [isHydrated, initializeAuth]);

  useEffect(() => {
    if (!isHydrated || isInitializing) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isHydrated, isInitializing, isAuthenticated, router]);

  if (!isHydrated || isInitializing) {
    return (
      <div className="min-h-screen bg-black-midnight flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-electric/30 border-t-blue-electric rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black-midnight">
      <Navbar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-h-[calc(100vh-64px)] overflow-x-hidden pb-24 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
