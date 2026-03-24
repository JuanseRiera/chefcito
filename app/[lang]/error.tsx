'use client';

import { useContext } from 'react';
import { Button } from '@/components/ui/button';
import { DictionaryContext } from '@/lib/i18n/dictionary-context';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dict = useContext(DictionaryContext);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-serif text-3xl text-charcoal mb-4">
        {dict?.error.title ?? 'Something went wrong'}
      </h1>
      <p className="text-brown-light mb-8 max-w-md">
        {error.message ||
          dict?.error.fallback ||
          'An unexpected error occurred.'}
      </p>
      <Button onClick={reset} variant="outline">
        {dict?.error.tryAgain ?? 'Try Again'}
      </Button>
    </div>
  );
}
