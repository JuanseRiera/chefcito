import { RecipeCard } from './recipe-card';
import type { recipeService } from '@/lib/services/recipeService';

// Infer the recipe type from the service method return
type RecipeWithCount = Awaited<
  ReturnType<typeof recipeService.getAllRecipes>
>[number];

interface RecipeCardGridProps {
  recipes: RecipeWithCount[];
}

export function RecipeCardGrid({ recipes }: RecipeCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
