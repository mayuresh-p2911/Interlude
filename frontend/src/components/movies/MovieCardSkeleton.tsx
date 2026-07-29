export default function MovieCardSkeleton() {
  return (
    <div className="w-44 flex-shrink-0">
      <div className="aspect-movie rounded-2xl skeleton" />
      <div className="mt-2 h-4 w-3/4 skeleton rounded" />
    </div>
  );
}
