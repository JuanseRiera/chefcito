import Link from 'next/link';
import { recipeService } from '@/lib/services/recipeService';
import { RecipeCardGrid } from '@/components/recipe-card-grid';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const recipes = await recipeService.getAllRecipes();

  if (recipes.length === 0) {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl text-charcoal">Your Recipes</h1>
        <Button render={<Link href="/extract" />} variant="outline" size="sm">
          + Extract Recipe
        </Button>
      </div>
      <RecipeCardGrid recipes={recipes} />
    </div>
  );
}
