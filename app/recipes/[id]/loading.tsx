import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function Loading() {
  return (
    <div>
      {/* Back link skeleton */}
      <Skeleton className="h-5 w-32 mb-6" />

      {/* Title skeleton */}
      <Skeleton className="h-10 w-3/4 mb-3" />

      {/* Description skeleton */}
      <Skeleton className="h-5 w-full mb-1" />
      <Skeleton className="h-5 w-2/3 mb-4" />

      {/* Metadata badges skeleton */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Attribution skeleton */}
      <Skeleton className="h-4 w-48 mb-6" />

      <Separator className="my-6" />

      {/* Content skeleton (two-column on desktop) */}
      <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-8">
        {/* Ingredients skeleton */}
        <div>
          <Skeleton className="h-7 w-28 mb-4" />
          <div className="space-y-4">
            {/* Category group 1 */}
            <div>
              <Skeleton className="h-3 w-16 mb-2" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </div>
            {/* Category group 2 */}
            <div>
              <Skeleton className="h-3 w-12 mb-2" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>

        {/* Instructions skeleton */}
        <div className="mt-8 lg:mt-0">
          <Skeleton className="h-7 w-28 mb-4" />
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
