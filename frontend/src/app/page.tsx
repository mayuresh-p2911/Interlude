import type { Metadata } from 'next';
import LandingPage from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'INTERLUDE — Watch Together, Stay Together',
  description:
    'INTERLUDE is the premium social movie streaming platform. Watch movies in perfect sync with friends. Voice chat, live group chat, and cinematic streaming experience.',
};

export default function HomePage() {
  return <LandingPage />;
}
