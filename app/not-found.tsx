import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-serif text-3xl text-charcoal mb-4">Page Not Found</h1>
      <p className="text-brown-light mb-8 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button render={<Link href="/" />} variant="outline">
        Back to Home
      </Button>
    </div>
  );
}
