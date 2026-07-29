import type { Metadata } from 'next';
import GroupDetailPage from '@/components/groups/GroupDetailPage';

export const metadata: Metadata = {
  title: 'Group Detail',
  description: 'Group detail, chat, voice, and movie queue on INTERLUDE',
};

export default function GroupDetailRoute({ params }: { params: { id: string } }) {
  return <GroupDetailPage groupId={params.id} />;
}
