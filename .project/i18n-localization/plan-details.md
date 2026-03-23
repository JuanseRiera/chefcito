# i18n: English/Spanish App Localization

## Context

The app has ~40 hardcoded English strings across ~15 files. Recipe language detection is already in place — the LLM returns a `language` field (ISO 639-1) that is stored in the `Recipe` DB model. Now we need app-level i18n so the entire UI can be displayed in English or Spanish.

**Two-layer approach:**
- **App language** (user preference via URL prefix `/en/` or `/es/`): nav, headings, buttons, error pages, form labels, progress messages
- **Recipe language** (LLM-detected, stored in `recipe.language`): metric badges like "4 porciones", "45 min cocción", "13 ingredientes" — these follow the recipe's own detected language, NOT the app language

## Tech Stack

- Next.js 16 (App Router, Server Components)
- TypeScript (strict mode)
- Tailwind CSS 4
- Prisma 7 + PostgreSQL 16

## Important

- Read the relevant guide in `node_modules/next/dist/docs/` before writing any code (especially `01-app/02-guides/internationalization.md` and `01-app/01-getting-started/16-proxy.md`).
- In Next.js 16, Middleware has been renamed to Proxy (`proxy.ts`).
- Follow the project workflow in `docs/DEVELOPER_WORKFLOW.md`: branch from `main`, conventional commits, PR via `gh`.

---

## String Classification

### App language strings (from URL `[lang]` segment)

These follow the user's selected language preference.

| Component | Strings |
|---|---|
| `components/navbar.tsx` | "My Recipes", "Extract Recipe" |
| `components/footer.tsx` | "Your AI-powered cooking companion" |
| `components/mobile-nav.tsx` | "Close menu", "Open menu" (aria-labels) |
| `app/page.tsx` | "Your Recipe Collection", "No recipes yet. Extract your first recipe to get started!", "Extract a Recipe", "Your Recipes", "+ Extract Recipe" |
| `app/extract/page.tsx` | "Extract a Recipe", "Paste a recipe URL and we'll format it for you.", "Extraction Failed", "Try Again" |
| `components/extract-form.tsx` | "Please enter a URL.", "Please enter a valid URL (e.g., https://example.com/recipe).", "Extracting...", "Extract Recipe", placeholder "https://example.com/recipe", aria-label "Recipe URL" |
| `components/extraction-progress.tsx` | "Fetching recipe...", "Extracting ingredients...", "Reviewing quality...", "Re-extracting...", "Saving recipe..." |
| `components/extraction-result.tsx` | "Recipe extracted successfully!", "View Full Recipe", "Extract another" |
| `components/recipe-detail.tsx` | "Back to Recipes", "Ingredients" (section heading), "Instructions" (section heading), "By", "Original source" |
| `components/ingredient-list.tsx` | "Other" (fallback category name) |
| `app/not-found.tsx` | "Page Not Found", "The page you're looking for doesn't exist.", "Back to Home" |
| `app/recipes/[id]/not-found.tsx` | "Recipe Not Found", "This recipe doesn't exist or has been removed.", "Back to Recipes" |
| `app/error.tsx` | "Something went wrong", "An unexpected error occurred.", "Try Again" |
| `app/layout.tsx` | metadata description "Your AI-powered cooking companion" |

### Recipe language strings (from `recipe.language` DB field)

These follow the recipe's detected language, NOT the app language. A Spanish recipe should show "4 porciones" even if the app is in English.

| Component | Strings |
|---|---|
| `components/recipe-card.tsx` | "{servings} servings", "{prepTime} min prep", "{cookTime} min cook", "{count} ingredients" |
| `components/recipe-detail.tsx` | "{servings} servings", "{prepTime} min prep", "{cookTime} min cook" |
| `components/extraction-result.tsx` | "{servings} servings", "{prepTime} min prep", "{cookTime} min cook", "{count} ingredients" |

---

## Step 1: i18n Foundation

### 1a. Create `lib/i18n/config.ts`

Shared module (no `'server-only'`) used by both server and client code.

```ts
export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const hasLocale = (locale: string): locale is Locale =>
  (locales as readonly string[]).includes(locale);
```

### 1b. Create dictionary JSON files

Create `app/[lang]/dictionaries/en.json` and `app/[lang]/dictionaries/es.json`.

Structure — flat namespace grouped by component/page:

```json
{
  "nav": {
    "myRecipes": "My Recipes",
    "extractRecipe": "Extract Recipe"
  },
  "footer": {
    "tagline": "Your AI-powered cooking companion"
  },
  "home": {
    "title": "Your Recipe Collection",
    "emptyState": "No recipes yet. Extract your first recipe to get started!",
    "extractCta": "Extract a Recipe",
    "yourRecipes": "Your Recipes",
    "extractButton": "+ Extract Recipe"
  },
  "extract": {
    "title": "Extract a Recipe",
    "subtitle": "Paste a recipe URL and we'll format it for you.",
    "failed": "Extraction Failed",
    "tryAgain": "Try Again"
  },
  "extractForm": {
    "placeholder": "https://example.com/recipe",
    "ariaLabel": "Recipe URL",
    "emptyUrl": "Please enter a URL.",
    "invalidUrl": "Please enter a valid URL (e.g., https://example.com/recipe).",
    "extracting": "Extracting...",
    "submit": "Extract Recipe"
  },
  "extractionProgress": {
    "fetching": "Fetching recipe...",
    "extracting": "Extracting ingredients...",
    "curating": "Reviewing quality...",
    "retrying": "Re-extracting...",
    "persisting": "Saving recipe..."
  },
  "extractionResult": {
    "success": "Recipe extracted successfully!",
    "viewFullRecipe": "View Full Recipe",
    "extractAnother": "Extract another"
  },
  "recipeDetail": {
    "backToRecipes": "Back to Recipes",
    "ingredients": "Ingredients",
    "instructions": "Instructions",
    "by": "By",
    "originalSource": "Original source"
  },
  "ingredientList": {
    "otherCategory": "Other"
  },
  "error": {
    "title": "Something went wrong",
    "fallback": "An unexpected error occurred.",
    "tryAgain": "Try Again"
  },
  "notFound": {
    "title": "Page Not Found",
    "description": "The page you're looking for doesn't exist.",
    "backHome": "Back to Home"
  },
  "recipeNotFound": {
    "title": "Recipe Not Found",
    "description": "This recipe doesn't exist or has been removed.",
    "backToRecipes": "Back to Recipes"
  },
  "metadata": {
    "description": "Your AI-powered cooking companion"
  },
  "mobileNav": {
    "closeMenu": "Close menu",
    "openMenu": "Open menu"
  }
}
```

The Spanish file (`es.json`) has identical keys with Spanish translations.

**Important:** Recipe metric labels (`servings`, `minPrep`, `minCook`, `ingredients`) are NOT in these dictionaries — they go in `recipeLabels.ts` (see Step 1f).

### 1c. Create `app/[lang]/dictionaries.ts`

```ts
import 'server-only'

const dictionaries = {
  en: () => import('./dictionaries/en.json').then((m) => m.default),
  es: () => import('./dictionaries/es.json').then((m) => m.default),
}

export type Dictionary = Awaited<ReturnType<typeof dictionaries.en>>
export const getDictionary = async (locale: 'en' | 'es') => dictionaries[locale]()
```

This follows the exact pattern from the Next.js 16 i18n docs. The `'server-only'` import ensures this is never accidentally imported from a client component.

### 1d. Create `lib/i18n/dictionary-context.tsx` (client component)

```tsx
'use client'

import { createContext, useContext } from 'react'
import type { Dictionary } from '@/app/[lang]/dictionaries'

const DictionaryContext = createContext<Dictionary | null>(null)

export function DictionaryProvider({ dictionary, children }: { dictionary: Dictionary; children: React.ReactNode }) {
  return <DictionaryContext.Provider value={dictionary}>{children}</DictionaryContext.Provider>
}

export function useDictionary(): Dictionary {
  const dict = useContext(DictionaryContext)
  if (!dict) throw new Error('useDictionary must be used within a DictionaryProvider')
  return dict
}
```

### 1e. Create `lib/i18n/locale-context.tsx` (client component)

```tsx
'use client'

import { createContext, useContext } from 'react'
import type { Locale } from '@/lib/i18n/config'

const LocaleContext = createContext<Locale>('en')

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useLocale(): Locale {
  return useContext(LocaleContext)
}
```

### 1f. Create `lib/i18n/recipeLabels.ts` (recipe-language labels)

This is a small, separate translation map for recipe metric labels. It is keyed by the recipe's `language` field (ISO 639-1), NOT the app language.

```ts
interface RecipeMetricLabels {
  servings: string;
  minPrep: string;
  minCook: string;
  ingredients: string;
}

const labels: Record<string, RecipeMetricLabels> = {
  en: {
    servings: 'servings',
    minPrep: 'min prep',
    minCook: 'min cook',
    ingredients: 'ingredients',
  },
  es: {
    servings: 'porciones',
    minPrep: 'min preparación',
    minCook: 'min cocción',
    ingredients: 'ingredientes',
  },
};

export function getRecipeLabels(language: string): RecipeMetricLabels {
  return labels[language] ?? labels.en;
}
```

Used by: `recipe-card.tsx`, `recipe-detail.tsx`, `extraction-result.tsx`.

---

## Step 2: Proxy (Locale Detection)

Create `proxy.ts` in the project root (Next.js 16 renamed `middleware.ts` to `proxy.ts`).

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const locales = ['en', 'es']
const defaultLocale = 'en'

function getLocale(request: NextRequest): string {
  const acceptLang = request.headers.get('accept-language') ?? ''
  for (const locale of locales) {
    if (acceptLang.includes(locale)) return locale
  }
  return defaultLocale
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
  if (pathnameHasLocale) return

  const locale = getLocale(request)
  request.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|logoOutlined.png|apple-touch-icon.png|favicon.png|sitemap.xml|robots.txt).*)',
  ],
}
```

---

## Step 3: Restructure `app/` under `[lang]`

### 3a. `app/layout.tsx` → minimal passthrough

Next.js requires a root layout. Since `[lang]` is a dynamic segment, the root layout must exist as a passthrough:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

### 3b. Create `app/[lang]/layout.tsx`

This is the real root layout. Move the current `app/layout.tsx` here and modify it:

- Receives `params: Promise<{ lang: string }>` (Next.js 16 async params)
- Validates lang with `hasLocale()`, calls `notFound()` if invalid
- Loads dictionary via `getDictionary(lang)`
- Sets `<html lang={lang}>`
- Wraps children in `DictionaryProvider` + `LocaleProvider`
- Passes `dict` and `lang` as props to `<Navbar>` and `<Footer>`
- Exports `generateStaticParams` returning `[{ lang: 'en' }, { lang: 'es' }]`
- Exports `generateMetadata` using dictionary for description

### 3c. Move all pages under `app/[lang]/`

| From | To | Notes |
|---|---|---|
| `app/page.tsx` | `app/[lang]/page.tsx` | |
| `app/not-found.tsx` | `app/[lang]/not-found.tsx` | Convert to client component using `useDictionary()` |
| `app/error.tsx` | `app/[lang]/error.tsx` | Use `useDictionary()` with hardcoded EN fallback |
| `app/loading.tsx` | `app/[lang]/loading.tsx` | No text changes needed (skeleton only) |
| `app/extract/page.tsx` | `app/[lang]/extract/page.tsx` | |
| `app/recipes/[id]/page.tsx` | `app/[lang]/recipes/[id]/page.tsx` | |
| `app/recipes/[id]/not-found.tsx` | `app/[lang]/recipes/[id]/not-found.tsx` | Convert to client component |
| `app/recipes/[id]/loading.tsx` | `app/[lang]/recipes/[id]/loading.tsx` | No text changes needed |
| `app/globals.css` | stays at `app/globals.css` | Imported from `[lang]` layout |
| `app/global-error.tsx` | stays at `app/global-error.tsx` | Hardcoded EN — renders outside all layouts |
| `app/api/*` | stays at `app/api/*` | No UI, no i18n needed |

---

## Step 4: Update Components

### Server components — receive `dict`/`lang` as props

**`components/navbar.tsx`**
- Accept `dict: Dictionary` and `lang: Locale` props
- Build nav links with locale prefix: `/${lang}/`, `/${lang}/extract`
- Add `<LanguageToggle />` component

**`components/footer.tsx`**
- Accept `dict: Dictionary` prop
- Use `dict.footer.tagline`

**`components/recipe-detail.tsx`**
- App language (from `dict` prop): "Back to Recipes", "Ingredients", "Instructions", "By", "Original source"
- Recipe language (from `getRecipeLabels(recipe.language)`): "servings", "min prep", "min cook" badges
- Link "Back to Recipes" uses `/${lang}/`

**`components/ingredient-list.tsx`**
- Accept `otherCategoryLabel: string` prop (passed from dict by parent)
- Replace hardcoded `'Other'` with this prop

### Client components — use `useDictionary()` + `useLocale()`

**`components/extract-form.tsx`**
- Use `useDictionary()` for: placeholder, aria-label, validation messages, button text

**`components/extraction-progress.tsx`**
- Replace `stageLabels` record with `useDictionary().extractionProgress`

**`components/extraction-result.tsx`**
- App language (from `useDictionary()`): "Recipe extracted successfully!", "View Full Recipe", "Extract another"
- Recipe language (from `getRecipeLabels(recipe.language)`): metric badges
- Links use `useLocale()` for prefix

**`components/recipe-card.tsx`**
- Recipe language (from `getRecipeLabels(recipe.language)`): metric badges
- Must become a client component or receive `lang` prop for locale-prefixed link
- Use `useLocale()` for `/${lang}/recipes/${recipe.id}` link

**`components/mobile-nav.tsx`**
- Already receives `links` as props from navbar (labels come from dict)
- Aria-labels: use `useDictionary().mobileNav`

### New component: `components/language-toggle.tsx`

```tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from '@/lib/i18n/locale-context'

export function LanguageToggle() {
  const locale = useLocale()
  const pathname = usePathname()
  const otherLocale = locale === 'en' ? 'es' : 'en'
  const newPath = pathname.replace(`/${locale}`, `/${otherLocale}`)

  return (
    <Link href={newPath} className="text-brown-light hover:text-burgundy transition-colors text-sm font-medium">
      {locale === 'en' ? 'ES' : 'EN'}
    </Link>
  )
}
```

### Link updates

All internal `href` values must be locale-prefixed:
- `/` → `/${lang}/`
- `/extract` → `/${lang}/extract`
- `/recipes/${id}` → `/${lang}/recipes/${id}`

In server components, use the `lang` prop. In client components, use `useLocale()`.

---

## Step 5: Update Pages

### `app/[lang]/page.tsx` (Home)
- Receives `params.lang`, loads dictionary
- Uses `dict.home.*` for all text
- Links use `/${lang}/extract`

### `app/[lang]/extract/page.tsx`
- Client component — uses `useDictionary()` for heading, subtitle, error alert text

### `app/[lang]/recipes/[id]/page.tsx`
- Receives `params.lang`, loads dictionary
- Passes `dict` and `lang` to `<RecipeDetail>`

### `app/[lang]/not-found.tsx`
- Convert to client component, use `useDictionary().notFound.*`

### `app/[lang]/recipes/[id]/not-found.tsx`
- Convert to client component, use `useDictionary().recipeNotFound.*`

### `app/[lang]/error.tsx`
- Client component, use `useDictionary()` with try/catch fallback to English (in case the dictionary provider itself errored)

### `app/global-error.tsx`
- Keep hardcoded English strings — this renders outside all layouts so has no access to dictionary context

---

## Step 6: Tests

- **`app/api/recipes/extract/route.e2e.test.ts`**: No changes — API route is outside `[lang]`
- **`lib/mas/agents/*.test.ts`**: No changes — mocked prompts
- **`lib/services/recipeService.integration.test.ts`**: No changes
- Existing tests should continue to pass as-is

---

## Verification

1. `npx next build` — must succeed
2. `npx vitest run` — all tests pass
3. Manual: visit `/` → redirects to `/en/` (or `/es/` if browser is Spanish)
4. Manual: set browser to Spanish → redirects to `/es/`
5. Manual: click EN/ES toggle → UI labels switch language, recipe metric badges stay in recipe's language
6. Manual: extract an English recipe with UI in Spanish → UI chrome in Spanish, badges say "8 servings", "40 min cook"
7. Manual: extract a Spanish recipe with UI in English → UI chrome in English, badges say "4 porciones", "45 min cocción"

---

## Files Summary

### New files to create
| File | Purpose |
|---|---|
| `proxy.ts` | Locale detection and redirect |
| `lib/i18n/config.ts` | Locale constants, types, `hasLocale()` |
| `lib/i18n/dictionary-context.tsx` | `DictionaryProvider` + `useDictionary()` hook |
| `lib/i18n/locale-context.tsx` | `LocaleProvider` + `useLocale()` hook |
| `lib/i18n/recipeLabels.ts` | Recipe-language metric labels (`getRecipeLabels()`) |
| `app/[lang]/dictionaries.ts` | `getDictionary()` server function |
| `app/[lang]/dictionaries/en.json` | English translations |
| `app/[lang]/dictionaries/es.json` | Spanish translations |
| `app/[lang]/layout.tsx` | Real root layout with i18n providers |
| `components/language-toggle.tsx` | EN/ES switch component |

### Files to move (from → to)
| From | To |
|---|---|
| `app/page.tsx` | `app/[lang]/page.tsx` |
| `app/not-found.tsx` | `app/[lang]/not-found.tsx` |
| `app/error.tsx` | `app/[lang]/error.tsx` |
| `app/loading.tsx` | `app/[lang]/loading.tsx` |
| `app/extract/page.tsx` | `app/[lang]/extract/page.tsx` |
| `app/recipes/[id]/page.tsx` | `app/[lang]/recipes/[id]/page.tsx` |
| `app/recipes/[id]/not-found.tsx` | `app/[lang]/recipes/[id]/not-found.tsx` |
| `app/recipes/[id]/loading.tsx` | `app/[lang]/recipes/[id]/loading.tsx` |

### Files to modify
| File | Changes |
|---|---|
| `app/layout.tsx` | Becomes minimal passthrough (no HTML/body tags) |
| `components/navbar.tsx` | Accept `dict` + `lang` props, locale-prefix links, add `LanguageToggle` |
| `components/footer.tsx` | Accept `dict` prop |
| `components/mobile-nav.tsx` | Use `useDictionary()` for aria-labels |
| `components/extract-form.tsx` | Use `useDictionary()` for all text |
| `components/extraction-progress.tsx` | Use `useDictionary()` for stage labels |
| `components/extraction-result.tsx` | `useDictionary()` for app strings + `getRecipeLabels()` for metric badges |
| `components/recipe-card.tsx` | `getRecipeLabels()` for metric badges + `useLocale()` for link |
| `components/recipe-detail.tsx` | `dict` prop for headings + `getRecipeLabels()` for metric badges |
| `components/ingredient-list.tsx` | Accept `otherCategoryLabel` prop |

### Files that stay unchanged
| File | Reason |
|---|---|
| `app/global-error.tsx` | Renders outside all layouts — keep hardcoded EN |
| `app/api/recipes/extract/route.ts` | API route, no UI |
| `lib/mas/**` | Already handles recipe language detection |
| `prisma/schema.prisma` | Already has `language` column |
