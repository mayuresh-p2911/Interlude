'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { BellIcon, CheckIcon } from '@heroicons/react/24/solid';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(),
  });

  const notifications = (data?.data as { data: Record<string, unknown>[] })?.data ?? [];

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast.success('All marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Notifications</h1>
          <p className="text-text-secondary text-sm">Stay updated on invites and activity</p>
        </div>

        <button
          onClick={() => markAllRead.mutate()}
          className="btn-ghost py-2 px-4 text-xs flex items-center gap-1.5"
        >
          <CheckIcon className="w-4 h-4" /> Mark All Read
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-electric/30 border-t-blue-electric rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="neo-card p-12 text-center text-text-muted space-y-3">
          <BellIcon className="w-10 h-10 text-blue-electric mx-auto" />
          <p className="text-sm font-bold text-white">No Notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={String(n._id)}
              className={`neo-card p-4 flex items-center justify-between transition-all ${
                !n.isRead ? 'border-l-4 border-blue-electric bg-blue-royal/5' : ''
              }`}
            >
              <div>
                <h4 className="text-sm font-bold text-white mb-1">{String(n.title)}</h4>
                <p className="text-xs text-text-secondary">{String(n.body)}</p>
              </div>
              <span className="text-[10px] text-text-muted">
                {new Date(String(n.createdAt)).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
