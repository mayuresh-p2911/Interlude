'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  const updateProfile = useMutation({
    mutationFn: () => usersApi.updateProfile({ username, bio }),
    onSuccess: (res) => {
      toast.success('Profile updated');
      setUser(res.data as any);
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await usersApi.uploadAvatar(file);
      toast.success('Avatar uploaded');
      setUser({ ...user!, avatar: (res.data as any).avatar });
    } catch {
      toast.error('Avatar upload failed');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white mb-1">Account Settings</h1>
        <p className="text-text-secondary text-sm">Update your profile information and preferences</p>
      </div>

      <div className="neo-card p-6 space-y-6">
        <div>
          <label className="block text-xs font-bold text-text-secondary mb-2">Avatar</label>
          <input type="file" accept="image/*" onChange={handleAvatarUpload} className="text-xs text-text-muted" />
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-field text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-2">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="input-field text-sm h-24"
          />
        </div>

        <button
          onClick={() => updateProfile.mutate()}
          className="btn-primary py-3 px-6 text-sm"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
