import type { Metadata } from 'next';
import MessagesPage from '@/components/messages/MessagesPage';

export const metadata: Metadata = {
  title: 'Direct Message',
  description: 'Chat with your friend on INTERLUDE',
};

export default function DMUserRoute({ params }: { params: { userId: string } }) {
  return <MessagesPage activeUserId={params.userId} />;
}
