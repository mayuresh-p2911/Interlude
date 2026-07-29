'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ChartBarIcon, UsersIcon, FilmIcon, SignalIcon } from '@heroicons/react/24/solid';

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  });

  const stats = (data?.data as Record<string, number>) ?? {};

  const cards = [
    { label: 'Total Users', value: stats.totalUsers ?? 0, icon: UsersIcon },
    { label: 'Active Users', value: stats.activeUsers ?? 0, icon: SignalIcon },
    { label: 'Total Movies', value: stats.totalMovies ?? 0, icon: FilmIcon },
    { label: 'Active Sessions', value: stats.activeSessions ?? 0, icon: ChartBarIcon },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white mb-1">Admin Dashboard</h1>
        <p className="text-text-secondary text-sm">Platform metrics and system configuration</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-electric/30 border-t-blue-electric rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <div key={card.label} className="neo-card p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-royal to-blue-electric flex items-center justify-center text-white shadow-blue-glow">
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-text-muted">{card.label}</p>
                <p className="text-2xl font-black text-white">{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
