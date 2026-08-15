'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import LandingPage from '@/components/landing/LandingPage';

export default function RootHomePage() {
  const { isAuthenticated, isInitializing, initializeAuth } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();

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
    if (isAuthenticated) {
      router.replace('/home');
    }
  }, [isHydrated, isInitializing, isAuthenticated, router]);

  if (!isHydrated || isInitializing) {
    return (
      <div className="min-h-screen bg-black-midnight flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-electric/30 border-t-blue-electric rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <LandingPage />;
}
