import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RecipeNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-serif text-3xl text-charcoal mb-4">
        Recipe Not Found
      </h1>
      <p className="text-brown-light mb-8 max-w-md">
        This recipe doesn&apos;t exist or has been removed.
      </p>
      <Button variant="outline" render={<Link href="/" />}>
        Back to Recipes
      </Button>
    </div>
  );
}
