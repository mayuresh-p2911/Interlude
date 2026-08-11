'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import {
  UserIcon,
  ShieldCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  PlusIcon,
  XMarkIcon,
  InformationCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';

type SettingsTab = 'profile' | 'privacy' | 'messaging';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // ── Profile Form State ────────────────────────────────────────
  const [username, setUsername] = useState(user?.username ?? '');
  const [pronouns, setPronouns] = useState(user?.pronouns ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [customStatusText, setCustomStatusText] = useState(
    user?.customStatus ? user.customStatus.text : '',
  );

  // ── Privacy & Message Settings State ──────────────────────────
  const [showFriendList, setShowFriendList] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [showLastActive, setShowLastActive] = useState(true);

  const [filterMessages, setFilterMessages] = useState<'none_to_spam' | 'non_friends_to_spam' | 'all_to_spam'>('none_to_spam');
  const [blockedWords, setBlockedWords] = useState<string[]>([]);
  const [newBlockedWord, setNewBlockedWord] = useState('');
  const [readReceipts, setReadReceipts] = useState(true);
  const [showEmojiReactions, setShowEmojiReactions] = useState(true);
  const [allowLinksFromNonFriends, setAllowLinksFromNonFriends] = useState(true);
  const [allowDmsFrom, setAllowDmsFrom] = useState<'all' | 'friends_only' | 'friends_user_added' | 'none'>('all');

  // Fetch current user settings
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => usersApi.getSettings(),
  });

  useEffect(() => {
    if (settingsData?.data) {
      const s = settingsData.data as any;
      if (s.privacy) {
        setShowFriendList(s.privacy.showFriendList ?? true);
        setShowActivity(s.privacy.showActivity ?? true);
        setShowLastActive(s.privacy.showLastActive ?? true);
      }
      if (s.messaging) {
        setFilterMessages(s.messaging.filterMessages ?? 'none_to_spam');
        setBlockedWords(s.messaging.blockedWords ?? []);
        setReadReceipts(s.messaging.readReceipts ?? true);
        setShowEmojiReactions(s.messaging.showEmojiReactions ?? true);
        setAllowLinksFromNonFriends(s.messaging.allowLinksFromNonFriends ?? true);
        setAllowDmsFrom(s.messaging.allowDmsFrom ?? 'all');
      }
    }
  }, [settingsData]);

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: () =>
      usersApi.updateProfile({
        username,
        bio,
        pronouns,
        customStatusText,
      }),
    onSuccess: (res) => {
      toast.success('Profile updated!');
      setUser(res.data as any);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to update profile');
    },
  });

  // Update Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (payload: any) => usersApi.updateSettings(payload),
    onSuccess: () => {
      toast.success('Settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await usersApi.uploadAvatar(file);
      const newAvatarUrl = (res.data as any)?.avatar || (res.data as any);
      toast.success('Avatar updated!');
      if (user && newAvatarUrl) {
        setUser({ ...user, avatar: newAvatarUrl });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const errorMsg = Array.isArray(msg) ? msg[0] : msg || 'Avatar upload failed';
      toast.error(errorMsg);
    }
  };

  const handleAddBlockedWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newBlockedWord.trim().toLowerCase();
    if (word && !blockedWords.includes(word)) {
      setBlockedWords([...blockedWords, word]);
      setNewBlockedWord('');
    }
  };

  const handleRemoveBlockedWord = (wordToRemove: string) => {
    setBlockedWords(blockedWords.filter((w) => w !== wordToRemove));
  };

  const handleSavePrivacySettings = () => {
    updateSettingsMutation.mutate({
      privacy: {
        showFriendList,
        showActivity,
        showLastActive,
      },
    });
  };

  const handleSaveMessageSettings = () => {
    updateSettingsMutation.mutate({
      messaging: {
        filterMessages,
        blockedWords,
        readReceipts,
        showEmojiReactions,
        allowLinksFromNonFriends,
        allowDmsFrom,
      },
    });
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white mb-1">Account & Preferences</h1>
        <p className="text-text-secondary text-sm">Customize your profile, privacy settings, and message controls</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 sm:gap-4 border-b border-white/5 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-blue-royal text-white shadow-blue-glow'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <UserIcon className="w-4 h-4" /> Profile Customization
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'privacy'
              ? 'bg-blue-royal text-white shadow-blue-glow'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldCheckIcon className="w-4 h-4" /> Profile Settings
        </button>

        <button
          onClick={() => setActiveTab('messaging')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'messaging'
              ? 'bg-blue-royal text-white shadow-blue-glow'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <ChatBubbleBottomCenterTextIcon className="w-4 h-4" /> Message Settings
        </button>
      </div>

      {/* ── TAB 1: Profile Customization ───────────────────────── */}
      {activeTab === 'profile' && (
        <div className="neo-card p-6 space-y-6">
          <div className="flex items-center gap-6 pb-6 border-b border-white/5">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-surface-3 flex items-center justify-center text-2xl font-black text-white shrink-0">
              {user?.avatar ? (
                <Image src={user.avatar} alt={user.username} fill className="object-cover" unoptimized />
              ) : (
                user?.username?.[0]?.toUpperCase()
              )}
            </div>
            <div>
              <label className="btn-secondary text-xs py-2 px-4 cursor-pointer inline-block mb-1">
                Change Profile Picture (PFP)
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-text-muted">JPEG, PNG or WebP up to 5MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <label className="block text-xs font-bold text-text-secondary mb-2">Pronouns</label>
              <input
                type="text"
                placeholder="e.g. he/him, she/her, they/them"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary mb-2">
              Custom Status <span className="text-text-muted font-normal">(lasts 24 hours)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="What's on your mind? (e.g. Movie Marathon Weekend 🍿)"
                value={customStatusText}
                onChange={(e) => setCustomStatusText(e.target.value)}
                className="input-field text-sm pr-10"
              />
              <SparklesIcon className="w-4 h-4 text-blue-ice absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary mb-2">Bio</label>
            <textarea
              placeholder="Tell your movie crew about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input-field text-sm h-24"
              maxLength={200}
            />
            <p className="text-right text-[11px] text-text-muted mt-1">{bio.length}/200</p>
          </div>

          <button
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending}
            className="btn-primary py-3 px-6 text-sm"
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      )}

      {/* ── TAB 2: Profile Settings (Privacy) ───────────────────── */}
      {activeTab === 'privacy' && (
        <div className="neo-card p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/5">
              <div>
                <h4 className="text-sm font-bold text-white">Show Friend List</h4>
                <p className="text-xs text-text-muted">Allow visitors to view your friend count and friends on your profile</p>
              </div>
              <input
                type="checkbox"
                checked={showFriendList}
                onChange={(e) => setShowFriendList(e.target.checked)}
                className="w-5 h-5 accent-blue-electric cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/5">
              <div>
                <h4 className="text-sm font-bold text-white">Show Recent Activity</h4>
                <p className="text-xs text-text-muted">Display what movie or watch session you are currently watching</p>
              </div>
              <input
                type="checkbox"
                checked={showActivity}
                onChange={(e) => setShowActivity(e.target.checked)}
                className="w-5 h-5 accent-blue-electric cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/5">
              <div>
                <h4 className="text-sm font-bold text-white">Show Last Active</h4>
                <p className="text-xs text-text-muted">Display when you were last active on INTERLUDE</p>
              </div>
              <input
                type="checkbox"
                checked={showLastActive}
                onChange={(e) => setShowLastActive(e.target.checked)}
                className="w-5 h-5 accent-blue-electric cursor-pointer"
              />
            </div>

            {/* Note Callout */}
            {!showLastActive && (
              <div className="p-4 rounded-xl bg-blue-royal/10 border border-blue-electric/20 flex items-start gap-3 text-blue-ice">
                <InformationCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  <strong>NOTE:</strong> If you disable &quot;Show last active&quot;, you will not be able to see anyone else&apos;s last active status either.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleSavePrivacySettings}
            disabled={updateSettingsMutation.isPending}
            className="btn-primary py-3 px-6 text-sm"
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Privacy Settings'}
          </button>
        </div>
      )}

      {/* ── TAB 3: Message Settings ────────────────────────────── */}
      {activeTab === 'messaging' && (
        <div className="neo-card p-6 space-y-8">
          {/* 1. Filter Messages */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Filter Messages</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'none_to_spam', label: 'No DMs to spam' },
                { id: 'non_friends_to_spam', label: 'DMs from non-friends to spam' },
                { id: 'all_to_spam', label: 'All DMs to spam' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`p-3.5 rounded-xl border text-xs font-semibold cursor-pointer flex items-center gap-2 transition-all ${
                    filterMessages === opt.id
                      ? 'bg-blue-royal/20 border-blue-electric text-white'
                      : 'bg-surface-2 border-white/5 text-text-secondary hover:bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="filterMessages"
                    value={opt.id}
                    checked={filterMessages === opt.id}
                    onChange={() => setFilterMessages(opt.id as any)}
                    className="accent-blue-electric"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* 2. Block Words */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Block Words</h3>
            <p className="text-xs text-text-muted">
              Enter words you want automatically filtered from your messages
            </p>
            <form onSubmit={handleAddBlockedWord} className="flex gap-2">
              <input
                type="text"
                placeholder="Type a word to block..."
                value={newBlockedWord}
                onChange={(e) => setNewBlockedWord(e.target.value)}
                className="input-field text-xs flex-1 max-w-sm"
              />
              <button type="submit" className="btn-secondary text-xs py-2 px-4 flex items-center gap-1">
                <PlusIcon className="w-3.5 h-3.5" /> Add Word
              </button>
            </form>

            <div className="flex flex-wrap gap-2 pt-2">
              {blockedWords.length === 0 ? (
                <span className="text-xs text-text-muted italic">No blocked words added</span>
              ) : (
                blockedWords.map((word) => (
                  <span
                    key={word}
                    className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() => handleRemoveBlockedWord(word)}
                      className="hover:text-white"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* 3. Read Receipts */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/5">
            <div>
              <h4 className="text-sm font-bold text-white">Read Receipts</h4>
              <p className="text-xs text-text-muted">
                If disabled, you won&apos;t see read receipts (blue ticks) nor will anyone else see yours
              </p>
            </div>
            <input
              type="checkbox"
              checked={readReceipts}
              onChange={(e) => setReadReceipts(e.target.checked)}
              className="w-5 h-5 accent-blue-electric cursor-pointer"
            />
          </div>

          {/* 4. Show Emoji Reactions */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/5">
            <div>
              <h4 className="text-sm font-bold text-white">Show Emoji Reactions</h4>
              <p className="text-xs text-text-muted">Display emoji reaction buttons and indicators on messages</p>
            </div>
            <input
              type="checkbox"
              checked={showEmojiReactions}
              onChange={(e) => setShowEmojiReactions(e.target.checked)}
              className="w-5 h-5 accent-blue-electric cursor-pointer"
            />
          </div>

          {/* 5. Allow Links From Non-Friends */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/5">
            <div>
              <h4 className="text-sm font-bold text-white">Allow Links from Non-Friends</h4>
              <p className="text-xs text-text-muted">
                If disabled, web links sent by non-friends will not be clickable unless they are added as friends
              </p>
            </div>
            <input
              type="checkbox"
              checked={allowLinksFromNonFriends}
              onChange={(e) => setAllowLinksFromNonFriends(e.target.checked)}
              className="w-5 h-5 accent-blue-electric cursor-pointer"
            />
          </div>

          {/* 6. Allow DMs From */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Allow Direct Messages (DMs) From</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { id: 'all', label: 'All' },
                { id: 'friends_only', label: 'Friends only' },
                { id: 'friends_user_added', label: 'Only friends user added' },
                { id: 'none', label: 'None' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer flex items-center gap-2 transition-all ${
                    allowDmsFrom === opt.id
                      ? 'bg-blue-royal/20 border-blue-electric text-white'
                      : 'bg-surface-2 border-white/5 text-text-secondary hover:bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="allowDmsFrom"
                    value={opt.id}
                    checked={allowDmsFrom === opt.id}
                    onChange={() => setAllowDmsFrom(opt.id as any)}
                    className="accent-blue-electric"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveMessageSettings}
            disabled={updateSettingsMutation.isPending}
            className="btn-primary py-3 px-6 text-sm"
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Message Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
