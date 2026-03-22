import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-parchment-dark bg-cream overflow-hidden"
          >
            {/* Image placeholder */}
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="p-4 space-y-3">
              {/* Title */}
              <Skeleton className="h-6 w-3/4" />
              {/* Description lines */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              {/* Badges */}
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
