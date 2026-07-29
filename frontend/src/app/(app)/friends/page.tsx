import type { Metadata } from 'next';
import FriendsPage from '@/components/friends/FriendsPage';

export const metadata: Metadata = {
  title: 'Friends',
  description: 'Manage your friends and view online status on INTERLUDE',
};

export default function FriendsRoute() {
  return <FriendsPage />;
}
