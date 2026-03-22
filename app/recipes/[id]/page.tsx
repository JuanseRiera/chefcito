import { notFound } from 'next/navigation';
import { recipeService } from '@/lib/services/recipeService';
import { RecipeDetail } from '@/components/recipe-detail';

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await recipeService.getRecipeById(id);

  if (!recipe) {
    notFound();
  }

  return <RecipeDetail recipe={recipe} />;
}
