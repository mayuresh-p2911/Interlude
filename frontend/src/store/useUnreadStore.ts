import { create } from 'zustand';

interface UnreadState {
  unreadMessagesCount: number;
  pendingFriendsCount: number;
  unreadGroupsCount: number;
  unreadNotificationsCount: number;

  setUnreadMessages: (count: number) => void;
  incrementUnreadMessages: () => void;
  clearUnreadMessages: () => void;

  setPendingFriends: (count: number) => void;
  incrementPendingFriends: () => void;
  clearPendingFriends: () => void;

  setUnreadGroups: (count: number) => void;
  incrementUnreadGroups: () => void;
  clearUnreadGroups: () => void;

  setUnreadNotifications: (count: number) => void;
  incrementUnreadNotifications: () => void;
  clearUnreadNotifications: () => void;
}

export const useUnreadStore = create<UnreadState>((set) => ({
  unreadMessagesCount: 0,
  pendingFriendsCount: 0,
  unreadGroupsCount: 0,
  unreadNotificationsCount: 0,

  setUnreadMessages: (count) => set({ unreadMessagesCount: count }),
  incrementUnreadMessages: () => set((state) => ({ unreadMessagesCount: state.unreadMessagesCount + 1 })),
  clearUnreadMessages: () => set({ unreadMessagesCount: 0 }),

  setPendingFriends: (count) => set({ pendingFriendsCount: count }),
  incrementPendingFriends: () => set((state) => ({ pendingFriendsCount: state.pendingFriendsCount + 1 })),
  clearPendingFriends: () => set({ pendingFriendsCount: 0 }),

  setUnreadGroups: (count) => set({ unreadGroupsCount: count }),
  incrementUnreadGroups: () => set((state) => ({ unreadGroupsCount: state.unreadGroupsCount + 1 })),
  clearUnreadGroups: () => set({ unreadGroupsCount: 0 }),

  setUnreadNotifications: (count) => set({ unreadNotificationsCount: count }),
  incrementUnreadNotifications: () => set((state) => ({ unreadNotificationsCount: state.unreadNotificationsCount + 1 })),
  clearUnreadNotifications: () => set({ unreadNotificationsCount: 0 }),
}));
