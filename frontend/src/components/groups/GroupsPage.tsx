'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { UserGroupIcon, PlusIcon } from '@heroicons/react/24/solid';

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getGroups(),
  });

  const groups = (data?.data as Record<string, unknown>[]) ?? [];

  const createMutation = useMutation({
    mutationFn: (dto: { name: string; description?: string }) => groupsApi.createGroup(dto),
    onSuccess: () => {
      toast.success('Group created!');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowCreateModal(false);
      setName('');
      setDescription('');
    },
    onError: () => toast.error('Failed to create group'),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Private Groups</h1>
          <p className="text-text-secondary text-sm">Your private movie clubs and shared watchlists</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary py-3 px-6 text-sm flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" /> Create Group
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-electric/30 border-t-blue-electric rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="neo-card p-12 text-center space-y-4">
          <UserGroupIcon className="w-12 h-12 text-blue-electric mx-auto" />
          <h3 className="text-xl font-bold text-white">No Groups Yet</h3>
          <p className="text-text-muted text-sm max-w-md mx-auto">
            Create a private group to queue movies together and chat with your friends.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => {
            const gId = String(group._id);
            const members = (group.members as unknown[]) ?? [];
            return (
              <Link key={gId} href={`/groups/${gId}`} className="neo-card p-6 block group hover:border-blue-electric/40 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-royal to-blue-electric flex items-center justify-center mb-4 text-white font-bold shadow-blue-glow">
                  {String(group.name ?? 'G')[0].toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-ice transition-colors">
                  {String(group.name)}
                </h3>
                <p className="text-text-muted text-xs line-clamp-2 mb-4">{String(group.description || 'No description.')}</p>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{members.length} members</span>
                  <span className="text-blue-electric font-semibold">Open Group →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md glass-navy p-6 rounded-3xl space-y-4">
            <h3 className="text-2xl font-bold text-white">Create Group</h3>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">Group Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Friday Movie Night"
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Our weekly movie club..."
                className="input-field text-sm h-24"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost flex-1 py-3 text-sm">
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate({ name, description })}
                disabled={!name.trim()}
                className="btn-primary flex-1 py-3 text-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
