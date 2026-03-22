# Implementation Plan: Story 2.4 - Recipe List Home Page

## 1. Prerequisites

- **Story 2.1** (Foundation) must be complete — theme, layout, navbar, shadcn/ui initialized
- **Story 2.2** (Extract Page) must be complete — shadcn Card and Badge components installed
- **Story 2.3** (Recipe Read API) must be complete — `recipeService.getAllRecipes()` available

No new dependencies or shadcn components needed. Card and Badge are installed in Story 2.2.

## 2. File & Directory Structure

| File Path                         | Action   | Purpose                                                             |
| :-------------------------------- | :------- | :------------------------------------------------------------------ |
| `app/page.tsx`                    | Modified | Replace Story 2.1's empty state with recipe grid (Server Component) |
| `app/loading.tsx`                 | New      | Skeleton loader for home page (shown while data loads)              |
| `components/recipe-card.tsx`      | New      | Individual recipe card (Server Component)                           |
| `components/recipe-card-grid.tsx` | New      | Responsive grid layout wrapper (Server Component)                   |

## 3. Data Flow

The home page is a **Server Component**. It calls `recipeService.getAllRecipes()` directly — no API route, no `useEffect`, no client-side fetching.

```
app/page.tsx (Server Component)
  → import { recipeService } from '@/lib/services/recipeService'
  → const recipes = await recipeService.getAllRecipes()
  → if (recipes.length === 0) render empty state
  → else render <RecipeCardGrid recipes={recipes} />
```

Next.js 16 automatically wraps async Server Components in `<Suspense>` when a `loading.tsx` file exists in the same route segment. The skeleton renders while the await resolves.

## 4. Component Implementations

### `app/page.tsx` (Server Component)

```typescript
import Link from 'next/link';
import { recipeService } from '@/lib/services/recipeService';
import { RecipeCardGrid } from '@/components/recipe-card-grid';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const recipes = await recipeService.getAllRecipes();

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="font-serif text-3xl text-charcoal mb-4">
          Your Recipe Collection
        </h1>
        <p className="text-brown-light mb-8 max-w-md">
          No recipes yet. Extract your first recipe to get started!
        </p>
        <Button asChild>
          <Link href="/extract">Extract a Recipe</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl text-charcoal">Your Recipes</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/extract">+ Extract Recipe</Link>
        </Button>
      </div>
      <RecipeCardGrid recipes={recipes} />
    </div>
  );
}
```

### `components/recipe-card-grid.tsx` (Server Component)

```typescript
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
```

**Note on type inference:** `Awaited<ReturnType<typeof recipeService.getAllRecipes>>[number]` extracts the element type from the returned array. This avoids manually redefining the Prisma return shape. If this pattern causes build issues (due to the `typeof` import), define an explicit interface instead:

```typescript
// Fallback if typeof import doesn't work
interface RecipeWithCount {
  id: string;
  title: string;
  description: string | null;
  cookTime: number | null;
  _count: { ingredients: number };
}
```

### `components/recipe-card.tsx` (Server Component)

```typescript
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { recipeService } from '@/lib/services/recipeService';

type RecipeWithCount = Awaited<
  ReturnType<typeof recipeService.getAllRecipes>
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
```

**Design details:**

- The entire card is wrapped in `<Link>` so clicking anywhere navigates to the detail page.
- `group` / `group-hover:` on the link enables the hover animation on the card.
- The image placeholder is a `h-40 bg-parchment-dark` area with a fork/knife SVG icon (very faint, `text-brown-light/40`). When images are added later, this is replaced with `<Image>`.
- `line-clamp-1` on title and `line-clamp-2` on description truncate overflow.
- Badges show cook time (if available) and ingredient count.

### `app/loading.tsx` (Skeleton Loader)

```typescript
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-parchment-dark bg-cream overflow-hidden"
          >
            {/* Image placeholder */}
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="p-4 space-y-3">
              {/* Title */}
              <Skeleton className="h-6 w-3/4" />
              {/* Description lines */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              {/* Badges */}
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Note:** The skeleton card structure mirrors the real `RecipeCard` structure exactly: image area (h-40), title line, 2 description lines, 2 badge blocks. This prevents layout shift when data loads.

## 5. Constraints & Decisions

- **Server Component data fetching:** `recipeService.getAllRecipes()` is called directly in the async Server Component. No `useEffect`, no `use` hook, no API route.
- **`loading.tsx` streaming:** Next.js automatically wraps the page in `<Suspense>` when `loading.tsx` exists. The skeleton shows while the page's async function runs.
- **Image placeholder:** Cards include a `h-40 bg-parchment-dark` placeholder for future image support. The Prisma schema has no image field yet. When images are added, replace the placeholder `<div>` with Next.js `<Image>`.
- **Type inference:** `Awaited<ReturnType<typeof recipeService.getAllRecipes>>[number]` infers the element type. If this causes issues, define an explicit interface as a fallback.
- **No pagination:** All recipes are loaded. This is fine for the initial scope. Pagination can be added later.
- **Hover animation:** Uses `group-hover:-translate-y-1 group-hover:shadow-lg` with `transition-all duration-200` for a subtle lift effect.

## 6. Verification Checklist

- [ ] Home page renders recipe grid when recipes exist in the database
- [ ] Grid is responsive: 1 column on mobile (<640px), 2 on tablet (≥640px), 3 on desktop (≥1024px)
- [ ] Each card shows: image placeholder (fork/knife icon), title (truncated 1 line), description (truncated 2 lines), cook time badge (if not null), ingredient count badge
- [ ] Cards have hover effect (lifts up with shadow)
- [ ] Clicking anywhere on a card navigates to `/recipes/[id]`
- [ ] Empty state renders when no recipes exist (shows heading + "Extract a Recipe" CTA button)
- [ ] "Extract a Recipe" CTA navigates to `/extract`
- [ ] "+" Extract Recipe" button (top right) navigates to `/extract`
- [ ] `loading.tsx` shows 6 skeleton cards matching the real card layout
- [ ] Skeleton appears while data loads (test by temporarily adding a delay in `getAllRecipes`)
- [ ] No layout shift when skeleton transitions to real content
- [ ] Mobile layout: single column, full-width cards with proper spacing
- [ ] `npm run build` passes with zero errors
