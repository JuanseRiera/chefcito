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
import { useDictionary } from '@/lib/i18n/dictionary-context';
import { useLocale } from '@/lib/i18n/locale-context';
import { getRecipeLabels } from '@/lib/i18n/recipeLabels';

interface ExtractionResultProps {
  recipe: ResultEvent['data']['recipe'];
  onExtractAnother: () => void;
}

export function ExtractionResult({
  recipe,
  onExtractAnother,
}: ExtractionResultProps) {
  const dict = useDictionary();
  const lang = useLocale();
  const labels = getRecipeLabels(recipe.language ?? 'en');

  return (
    <div className="mt-8">
      <p className="text-success font-medium mb-4">
        {dict.extractionResult.success}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl text-charcoal">
            {recipe.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recipe.description && (
            <p className="text-brown-light line-clamp-3 mb-4">
              {recipe.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
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
            <Badge variant="secondary">
              {recipe.ingredients.length} {labels.ingredients}
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 items-stretch sm:flex-row sm:items-center">
          <LinkButton
            href={`/${lang}/recipes/${recipe.id}`}
            className="flex-1"
          >
            {dict.extractionResult.viewFullRecipe}
          </LinkButton>
          <Button
            variant="ghost"
            onClick={onExtractAnother}
            className="text-brown-light"
          >
            {dict.extractionResult.extractAnother}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
