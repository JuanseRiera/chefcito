import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { getRecipeService } from '@/lib/services/recipeService';
import { RecipeCardGrid } from '@/components/recipe-card-grid';
import { LinkButton } from '@/components/ui/button';
import { hasLocale } from '@/lib/i18n/config';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from './dictionaries';

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang as Locale);

  await connection();
  const recipeService = getRecipeService();
  const recipes = await recipeService.getAllRecipes();

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="font-serif text-3xl text-charcoal mb-4">
          {dict.home.title}
        </h1>
        <p className="text-brown-light mb-8 max-w-md">
          {dict.home.emptyState}
        </p>
        <LinkButton href={`/${lang}/extract`}>
          {dict.home.extractCta}
        </LinkButton>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl text-charcoal">
          {dict.home.yourRecipes}
        </h1>
        <div className="flex gap-2">
          <LinkButton href={`/${lang}/create`} size="sm">
            {dict.home.createButton}
          </LinkButton>
          <LinkButton href={`/${lang}/extract`} variant="outline" size="sm">
            {dict.home.extractButton}
          </LinkButton>
        </div>
      </div>
      <RecipeCardGrid recipes={recipes} />
    </div>
  );
}
