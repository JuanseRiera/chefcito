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

interface ExtractionResultProps {
  recipe: ResultEvent['data']['recipe'];
  onExtractAnother: () => void;
}

export function ExtractionResult({
  recipe,
  onExtractAnother,
}: ExtractionResultProps) {
  return (
    <div className="mt-8">
      <p className="text-success font-medium mb-4">
        Recipe extracted successfully!
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
                {recipe.servings} servings
              </Badge>
            )}
            {recipe.prepTime != null && (
              <Badge variant="secondary">
                {recipe.prepTime} min prep
              </Badge>
            )}
            {recipe.cookTime != null && (
              <Badge variant="secondary">
                {recipe.cookTime} min cook
              </Badge>
            )}
            <Badge variant="secondary">
              {recipe.ingredients.length} ingredients
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 items-stretch sm:flex-row sm:items-center">
          <LinkButton href={`/recipes/${recipe.id}`} className="flex-1">
            View Full Recipe
          </LinkButton>
          <Button
            variant="ghost"
            onClick={onExtractAnother}
            className="text-brown-light"
          >
            Extract another
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
