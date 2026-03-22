import Link from 'next/link';
import type { recipeService } from '@/lib/services/recipeService';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { IngredientList } from './ingredient-list';
import { InstructionSteps } from './instruction-steps';

// Infer type from service method — the non-null variant (we only render when recipe exists)
type RecipeFull = NonNullable<
  Awaited<ReturnType<typeof recipeService.getRecipeById>>
>;

interface RecipeDetailProps {
  recipe: RecipeFull;
}

export function RecipeDetail({ recipe }: RecipeDetailProps) {
  return (
    <article>
      {/* Back link */}
      <Link
        href="/"
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
        Back to Recipes
      </Link>

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
          <Badge variant="secondary">{recipe.servings} servings</Badge>
        )}
        {recipe.prepTime != null && (
          <Badge variant="secondary">{recipe.prepTime} min prep</Badge>
        )}
        {recipe.cookTime != null && (
          <Badge variant="secondary">{recipe.cookTime} min cook</Badge>
        )}
      </div>

      {/* Attribution */}
      {(recipe.author || recipe.originalUrl) && (
        <div className="text-sm text-brown-light mb-6">
          {recipe.author && <span>By {recipe.author}</span>}
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
              Original source
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
            Ingredients
          </h2>
          <IngredientList ingredients={recipe.ingredients} />
        </section>

        {/* Instructions main */}
        <section className="mt-8 lg:mt-0">
          <h2 className="font-serif text-xl text-charcoal mb-4">
            Instructions
          </h2>
          <InstructionSteps steps={recipe.instructionSteps} />
        </section>
      </div>
    </article>
  );
}
