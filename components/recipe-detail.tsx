import Link from 'next/link';
import Image from 'next/image';
import type { RecipeService } from '@/lib/services/recipeService';
import type { Dictionary } from '@/app/[lang]/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { IngredientList } from './ingredient-list';
import { InstructionSteps } from './instruction-steps';
import { getRecipeLabels } from '@/lib/i18n/recipeLabels';

type RecipeFull = NonNullable<
  Awaited<ReturnType<RecipeService['getRecipeById']>>
>;

interface RecipeDetailProps {
  recipe: RecipeFull;
  dict: Dictionary;
  lang: Locale;
}

export function RecipeDetail({ recipe, dict, lang }: RecipeDetailProps) {
  const labels = getRecipeLabels(recipe.language ?? 'en');

  return (
    <article>
      {/* Back link */}
      <Link
        href={`/${lang}/`}
        className="inline-flex items-center gap-1 text-brown-light hover:text-burgundy transition-colors mb-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {dict.recipeDetail.backToRecipes}
      </Link>

      {/* Hero image */}
      {recipe.imageUrl && (
        <div className="relative w-full h-64 rounded-lg overflow-hidden mb-6">
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Title */}
      <h1 className="font-serif text-3xl md:text-4xl text-charcoal mb-3">
        {recipe.title}
      </h1>

      {/* Description */}
      {recipe.description && (
        <p className="text-brown-light text-lg mb-4">{recipe.description}</p>
      )}

      {/* Metadata bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {recipe.servings != null && (
          <Badge variant="secondary">
            {recipe.servings} {labels.servings}
          </Badge>
        )}
        {recipe.prepTime != null && (
          <Badge variant="secondary">
            {recipe.prepTime} {labels.minPrep}
          </Badge>
        )}
        {recipe.cookTime != null && (
          <Badge variant="secondary">
            {recipe.cookTime} {labels.minCook}
          </Badge>
        )}
      </div>

      {/* Attribution */}
      {(recipe.author || recipe.originalUrl) && (
        <div className="text-sm text-brown-light mb-6">
          {recipe.author && (
            <span>
              {dict.recipeDetail.by} {recipe.author}
            </span>
          )}
          {recipe.author && recipe.originalUrl && (
            <span className="mx-2">&middot;</span>
          )}
          {recipe.originalUrl && (
            <a
              href={recipe.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-burgundy hover:underline"
            >
              {dict.recipeDetail.originalSource}
            </a>
          )}
        </div>
      )}

      <Separator className="my-6" />

      {/* Content: ingredients + instructions */}
      <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-8">
        {/* Ingredients sidebar */}
        <section>
          <h2 className="font-serif text-xl text-charcoal mb-4">
            {dict.recipeDetail.ingredients}
          </h2>
          <IngredientList
            ingredients={recipe.ingredients}
            otherCategoryLabel={dict.ingredientList.otherCategory}
          />
        </section>

        {/* Instructions main */}
        <section className="mt-8 lg:mt-0">
          <h2 className="font-serif text-xl text-charcoal mb-4">
            {dict.recipeDetail.instructions}
          </h2>
          <InstructionSteps steps={recipe.instructionSteps} />
        </section>
      </div>
    </article>
  );
}
