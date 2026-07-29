import type { Metadata } from 'next';
import MessagesPage from '@/components/messages/MessagesPage';

export const metadata: Metadata = {
  title: 'Direct Messages',
  description: 'Direct messaging on INTERLUDE',
};

export default function MessagesRoute() {
  return <MessagesPage />;
}
