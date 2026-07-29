import type { Metadata } from 'next';
import MovieDetailPage from '@/components/movies/MovieDetailPage';

export const metadata: Metadata = {
  title: 'Movie Details',
  description: 'Movie details and streaming options on INTERLUDE',
};

export default function MoviePage({ params }: { params: { id: string } }) {
  return <MovieDetailPage movieId={params.id} />;
}
