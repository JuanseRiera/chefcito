'use client';

import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-serif text-3xl text-charcoal mb-4">
        Something went wrong
      </h1>
      <p className="text-brown-light mb-8 max-w-md">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <Button onClick={reset} variant="outline">
        Try Again
      </Button>
    </div>
  );
}
