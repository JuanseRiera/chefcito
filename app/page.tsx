import { connection } from 'next/server';
import { getRecipeService } from '@/lib/services/recipeService';
import { RecipeCardGrid } from '@/components/recipe-card-grid';
import { LinkButton } from '@/components/ui/button';

export default async function HomePage() {
  await connection();
  const recipeService = getRecipeService();
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
        <LinkButton href="/extract">Extract a Recipe</LinkButton>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl text-charcoal">Your Recipes</h1>
        <LinkButton href="/extract" variant="outline" size="sm">
          + Extract Recipe
        </LinkButton>
      </div>
      <RecipeCardGrid recipes={recipes} />
    </div>
  );
}
