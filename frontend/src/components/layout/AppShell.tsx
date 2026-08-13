'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useSocket } from '@/hooks/useSocket';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, fetchMe } = useAuthStore();
  const router = useRouter();
  const { isConnected } = useSocket();

  useEffect(() => {
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
    if (!isAuthenticated && !hasToken) {
      router.replace('/auth/login');
      return;
    }
    fetchMe().catch(() => {
      if (typeof window !== 'undefined' && !localStorage.getItem('access_token')) {
        router.replace('/auth/login');
      }
    });
  }, [isAuthenticated, fetchMe, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black-midnight flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-electric/30 border-t-blue-electric rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black-midnight">
      <Navbar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-h-[calc(100vh-64px)] overflow-x-hidden pb-16 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
