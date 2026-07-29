import type { Metadata } from 'next';
import WatchSessionPage from '@/components/watch/WatchSessionPage';

export const metadata: Metadata = {
  title: 'Watch Party',
  description: 'Synchronized watch session on INTERLUDE',
};

export default function WatchPage({ params }: { params: { sessionId: string } }) {
  return <WatchSessionPage sessionId={params.sessionId} />;
}
