import { notFound } from 'next/navigation';
import { getRecipeService } from '@/lib/services/recipeService';
import { RecipeDetail } from '@/components/recipe-detail';
import { hasLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '../../dictionaries';

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang as Locale);
  const recipeService = getRecipeService();
  const recipe = await recipeService.getRecipeById(id);

  if (!recipe) {
    notFound();
  }

  return <RecipeDetail recipe={recipe} dict={dict} lang={lang as Locale} />;
}
