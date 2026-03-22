# Implementation Plan: Story 2.5 - Recipe Detail Page

## 1. Prerequisites

- **Story 2.1** (Foundation) must be complete — theme, layout, shadcn/ui
- **Story 2.2** (Extract Page) must be complete — shadcn Badge component installed
- **Story 2.3** (Recipe Read API) must be complete — `recipeService.getRecipeById()`

Additional shadcn/ui component needed:

| Step          | Command                           | Purpose                          |
| :------------ | :-------------------------------- | :------------------------------- |
| Add Separator | `npx shadcn@latest add separator` | Visual dividers between sections |

## 2. File & Directory Structure

| File Path                          | Action           | Purpose                                            |
| :--------------------------------- | :--------------- | :------------------------------------------------- |
| `app/recipes/[id]/page.tsx`        | New              | Server Component, fetches recipe by ID             |
| `app/recipes/[id]/loading.tsx`     | New              | Skeleton loader for detail page                    |
| `app/recipes/[id]/not-found.tsx`   | New              | Recipe-specific 404 page                           |
| `components/recipe-detail.tsx`     | New              | Full recipe detail layout (Server Component)       |
| `components/ingredient-list.tsx`   | New              | Ingredients grouped by category (Server Component) |
| `components/instruction-steps.tsx` | New              | Numbered instruction steps (Server Component)      |
| `components/ui/separator.tsx`      | New (via shadcn) | Separator component                                |

## 3. Data Flow

```
app/recipes/[id]/page.tsx (Server Component)
  → import { recipeService } from '@/lib/services/recipeService'
  → const { id } = await params       ← params is a Promise in Next.js 16
  → const recipe = await recipeService.getRecipeById(id)
  → if (!recipe) call notFound()       ← triggers app/recipes/[id]/not-found.tsx
  → else render <RecipeDetail recipe={recipe} />
```

## 4. Component Implementations

### `app/recipes/[id]/page.tsx` (Server Component)

```typescript
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
```

**Critical Next.js 16 note:** In Next.js 16, `params` is a `Promise` and must be `await`ed. This is a breaking change from v15 where `params` was a plain object.

### `components/recipe-detail.tsx` (Server Component)

```typescript
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
```

**Layout details:**

- Mobile: single column, ingredients stacked above instructions (`mt-8` on instructions section).
- Desktop (≥1024px): two-column grid with `lg:grid-cols-[1fr_2fr]`. Ingredients take 1/3 width, instructions take 2/3.
- External links use `target="_blank" rel="noopener noreferrer"` for security.

### `components/ingredient-list.tsx` (Server Component)

```typescript
interface Ingredient {
  id: string;
  quantity: number | null;
  unit: string | null;
  name: string;
  category: string | null;
}

interface IngredientListProps {
  ingredients: Ingredient[];
}

/**
 * Formats a single ingredient as a readable string.
 * Handles null quantity and unit gracefully.
 */
function formatIngredient(ing: Ingredient): string {
  const parts: string[] = [];
  if (ing.quantity != null) {
    // Format whole numbers without decimal, fractional with one decimal
    parts.push(
      Number.isInteger(ing.quantity)
        ? ing.quantity.toString()
        : ing.quantity.toFixed(1),
    );
  }
  if (ing.unit) {
    parts.push(ing.unit);
  }
  parts.push(ing.name);
  return parts.join(' ');
}

/**
 * Groups ingredients by category.
 * Ingredients with null/empty category go into "Other".
 */
function groupByCategory(
  ingredients: Ingredient[],
): Map<string, Ingredient[]> {
  const groups = new Map<string, Ingredient[]>();

  for (const ing of ingredients) {
    const category = ing.category?.trim() || 'Other';
    const existing = groups.get(category);
    if (existing) {
      existing.push(ing);
    } else {
      groups.set(category, [ing]);
    }
  }

  return groups;
}

export function IngredientList({ ingredients }: IngredientListProps) {
  const groups = groupByCategory(ingredients);

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gold mb-2">
            {category}
          </h3>
          <ul className="space-y-1">
            {items.map((ing) => (
              <li key={ing.id} className="flex items-start gap-2 text-sm">
                <span className="text-gold mt-1.5 shrink-0">&bull;</span>
                <span className="text-brown">{formatIngredient(ing)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

### `components/instruction-steps.tsx` (Server Component)

```typescript
interface InstructionStep {
  id: string;
  stepNumber: number;
  instruction: string;
}

interface InstructionStepsProps {
  steps: InstructionStep[];
}

export function InstructionSteps({ steps }: InstructionStepsProps) {
  return (
    <ol className="space-y-6">
      {steps.map((step) => (
        <li key={step.id} className="flex gap-4">
          {/* Step number circle */}
          <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gold/10 text-gold font-semibold text-sm">
            {step.stepNumber}
          </span>
          {/* Step text */}
          <p className="text-brown pt-1 leading-relaxed">
            {step.instruction}
          </p>
        </li>
      ))}
    </ol>
  );
}
```

**Design details:**

- Step number in a soft gold circle (`bg-gold/10` for a light gold background, `text-gold` for the number).
- `leading-relaxed` for comfortable reading of long instruction text.
- `gap-4` between number and text, `space-y-6` between steps.

### `app/recipes/[id]/loading.tsx` (Skeleton Loader)

```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function Loading() {
  return (
    <div>
      {/* Back link skeleton */}
      <Skeleton className="h-5 w-32 mb-6" />

      {/* Title skeleton */}
      <Skeleton className="h-10 w-3/4 mb-3" />

      {/* Description skeleton */}
      <Skeleton className="h-5 w-full mb-1" />
      <Skeleton className="h-5 w-2/3 mb-4" />

      {/* Metadata badges skeleton */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Attribution skeleton */}
      <Skeleton className="h-4 w-48 mb-6" />

      <Separator className="my-6" />

      {/* Content skeleton (two-column on desktop) */}
      <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-8">
        {/* Ingredients skeleton */}
        <div>
          <Skeleton className="h-7 w-28 mb-4" />
          <div className="space-y-4">
            {/* Category group 1 */}
            <div>
              <Skeleton className="h-3 w-16 mb-2" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </div>
            {/* Category group 2 */}
            <div>
              <Skeleton className="h-3 w-12 mb-2" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>

        {/* Instructions skeleton */}
        <div className="mt-8 lg:mt-0">
          <Skeleton className="h-7 w-28 mb-4" />
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### `app/recipes/[id]/not-found.tsx` (Server Component)

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RecipeNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-serif text-3xl text-charcoal mb-4">
        Recipe Not Found
      </h1>
      <p className="text-brown-light mb-8 max-w-md">
        This recipe doesn&apos;t exist or has been removed.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Back to Recipes</Link>
      </Button>
    </div>
  );
}
```

## 5. Constraints & Decisions

- **Server Component only:** The detail page and all its sub-components (`RecipeDetail`, `IngredientList`, `InstructionSteps`) are Server Components. No `'use client'` directive anywhere. No React hooks, no state, no effects.
- **Next.js 16 `params` is a Promise:** `params` must be `await`ed. This is a breaking change from v15. Writing `const { id } = params` without `await` will cause a TypeScript error or runtime error.
- **`notFound()` integration:** When `getRecipeById` returns `null`, the page calls `notFound()` from `next/navigation`. This triggers rendering of `app/recipes/[id]/not-found.tsx`.
- **Ingredient grouping:** Done in the `IngredientList` component using a `Map`, not in the Prisma query. The number of ingredients per recipe is small (typically 5-30), so client-side grouping is fine.
- **Quantity formatting:** Whole numbers display without decimals (`2`), fractional numbers with one decimal (`1.5`). Uses `Number.isInteger()` check.
- **External links:** Original URL uses `target="_blank" rel="noopener noreferrer"` for security.
- **No edit/personalization:** This page is read-only. Personalization (notes, ratings, cooking time) is a future feature (PRD Feature 2.3).
- **No icon library:** SVG icons are inlined (back chevron). Consistent with Story 2.2's approach.

## 6. Verification Checklist

- [ ] `/recipes/[valid-id]` renders the full recipe detail page
- [ ] Title is displayed in Playfair Display (`font-serif`) with `text-charcoal`
- [ ] Description renders below the title in `text-brown-light`
- [ ] Metadata badges show servings, prep time, cook time — only those that are not null
- [ ] Author name displays if present in the recipe data
- [ ] Original URL displays as an "Original source" link that opens in a new tab
- [ ] If both author and URL exist, they are separated by a dot (middot)
- [ ] Separator renders between metadata and content sections
- [ ] Ingredients are grouped by category with uppercase gold headers (`text-gold`, `text-xs`, `uppercase`)
- [ ] Ingredients with null/empty category appear under "Other"
- [ ] Each ingredient displays as "quantity unit name" — null quantity/unit are omitted gracefully
- [ ] Whole quantities show no decimals (2), fractional show one decimal (1.5)
- [ ] Instruction steps are numbered with gold circle badges (`bg-gold/10 text-gold`)
- [ ] Steps are ordered by `stepNumber` ascending (from the Prisma query)
- [ ] "Back to Recipes" link at top navigates to `/`
- [ ] Back link has a left chevron icon
- [ ] `/recipes/nonexistent-id-here` shows the recipe-specific not-found page with "Back to Recipes" button
- [ ] `loading.tsx` shows skeleton matching the detail page layout (title, description, badges, two-column content)
- [ ] Skeleton matches the two-column layout on desktop (lg breakpoint)
- [ ] Mobile (< 1024px): single column — ingredients stacked above instructions
- [ ] Desktop (≥ 1024px): two-column grid — ingredients 1/3, instructions 2/3
- [ ] No layout shift when skeleton transitions to real content
- [ ] `npm run build` passes with zero errors
