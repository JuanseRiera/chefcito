import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RecipeService } from '@/lib/services/recipeService';

type RecipeWithCount = Awaited<
  ReturnType<RecipeService['getAllRecipes']>
>[number];

interface RecipeCardProps {
  recipe: RecipeWithCount;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link href={`/recipes/${recipe.id}`} className="block group">
      <Card className="h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
        {/* Image placeholder — for future image support */}
        <div className="h-40 bg-parchment-dark flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brown-light/40"
          >
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <path d="M7 2v20" />
            <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
          </svg>
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="font-serif text-lg text-charcoal line-clamp-1">
            {recipe.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-2">
          {recipe.description && (
            <p className="text-brown-light text-sm line-clamp-2">
              {recipe.description}
            </p>
          )}
        </CardContent>

        <CardFooter className="pt-0">
          <div className="flex flex-wrap gap-2">
            {recipe.cookTime != null && (
              <Badge variant="secondary" className="text-xs">
                {recipe.cookTime} min
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {recipe._count.ingredients} ingredients
            </Badge>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
