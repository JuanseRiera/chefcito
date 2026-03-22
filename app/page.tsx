import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-serif text-3xl text-charcoal mb-4">
        Your Recipe Collection
      </h1>
      <p className="text-brown-light mb-8 max-w-md">
        No recipes yet. Extract your first recipe to get started!
      </p>
      <Button render={<Link href="/extract" />}>Extract a Recipe</Button>
    </div>
  );
}
