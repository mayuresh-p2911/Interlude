import type { Metadata } from 'next';
import GroupsPage from '@/components/groups/GroupsPage';

export const metadata: Metadata = {
  title: 'Groups',
  description: 'Your private movie groups and clubs on INTERLUDE',
};

export default function GroupsRoute() {
  return <GroupsPage />;
}
