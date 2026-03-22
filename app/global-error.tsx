'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-parchment text-brown">
        <h1 className="text-3xl mb-4">Something went wrong</h1>
        <p className="text-brown-light mb-8">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-burgundy text-white rounded hover:bg-burgundy-dark transition-colors"
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
