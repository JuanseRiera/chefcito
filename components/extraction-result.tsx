'use client';

import type { ResultEvent } from '@/lib/types/sse';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import type { Dictionary } from '@/app/[lang]/dictionaries';
import { getRecipeLabels } from '@/lib/i18n/recipeLabels';

interface ExtractionResultProps {
  labels: Dictionary['extractionResult'];
  recipe: ResultEvent['data']['recipe'];
  locale: string;
  onExtractAnother: () => void;
}

export function ExtractionResult({
  labels,
  recipe,
  locale,
  onExtractAnother,
}: ExtractionResultProps) {
  const recipeLabels = getRecipeLabels(recipe.language ?? 'en');

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-sm font-medium text-success">
        <span className="h-2 w-2 rounded-full bg-success" />
        {labels.success}
      </div>

      <Card className="overflow-hidden rounded-[1.75rem] border border-border py-0 shadow-sm">
        <CardHeader className="border-b border-border bg-parchment/35 py-5">
          <CardTitle className="font-serif text-2xl text-charcoal">
            {recipe.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 py-5">
          {recipe.description && (
            <p className="line-clamp-3 text-sm leading-6 text-brown-light">
              {recipe.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {recipe.servings != null && (
              <Badge variant="secondary" className="h-6 px-2.5 text-xs">
                {recipe.servings} {recipeLabels.servings}
              </Badge>
            )}
            {recipe.prepTime != null && (
              <Badge variant="secondary" className="h-6 px-2.5 text-xs">
                {recipe.prepTime} {recipeLabels.minPrep}
              </Badge>
            )}
            {recipe.cookTime != null && (
              <Badge variant="secondary" className="h-6 px-2.5 text-xs">
                {recipe.cookTime} {recipeLabels.minCook}
              </Badge>
            )}
            <Badge variant="secondary" className="h-6 px-2.5 text-xs">
              {recipe.ingredients.length} {recipeLabels.ingredients}
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 border-t border-border bg-parchment/35 sm:flex-row sm:items-center">
          <LinkButton
            href={`/${locale}/recipes/${recipe.id}`}
            className="flex-1"
            size="lg"
          >
            {labels.viewFullRecipe}
          </LinkButton>
          <Button
            variant="outline"
            onClick={onExtractAnother}
            className="flex-1 text-brown-light"
            size="lg"
          >
            {labels.extractAnother}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
