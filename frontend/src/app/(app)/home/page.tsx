import type { Metadata } from 'next';
import HomePageContent from '@/components/home/HomePageContent';

export const metadata: Metadata = {
  title: 'Home — Discover Movies',
  description: 'Browse trending movies, continue watching, and discover new films to watch with friends.',
};

export default function HomePage() {
  return <HomePageContent />;
}
