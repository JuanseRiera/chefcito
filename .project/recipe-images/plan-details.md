# Recipe Images: Detection & Supabase Storage

## Context

Recipe cards and detail pages currently show a generic SVG placeholder. The frontend-and-ux-polish feature explicitly listed images as "out of scope (placeholder only — images will be added in a future feature)." This is that feature.

The approach: during extraction, detect the recipe image from the source page's `og:image` meta tag or JSON-LD structured data — no LLM cost. If found, download it and re-upload it to Supabase Storage via the REST API (no new dependencies). The public Supabase URL is stored in a new `imageUrl` column on the `Recipe` model, and the UI conditionally renders it via Next.js `<Image>`.

If no image is found, or if the upload fails, the recipe is still saved normally — images are strictly optional and non-blocking.

## Tech Stack

- Next.js 16 (App Router, Server Components)
- TypeScript (strict mode)
- Prisma 7 + PostgreSQL 16
- Supabase Storage — accessed via direct `fetch` against the REST API (no new SDK dependency)
- node-html-parser (already a project dependency via `extractRecipeText.ts`)

## Important

- Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
- `imageUrl` is extracted from the HTML, NOT from the LLM — don't add it to the Gemini prompt or the Zod schema.
- Image upload must never block recipe persistence. Always `try/catch` upload errors and return `null` on failure.
- Follow the project workflow in `docs/DEVELOPER_WORKFLOW.md`: branch from `main`, conventional commits, PR via `gh`.

---

## Step 1: Infrastructure — Supabase Storage Bucket

No changes to `docker-compose.yml`. Supabase Storage is external.

**Manual setup (one-time):** In the Supabase dashboard, create a public bucket named `recipe-images`.

**New env vars** — add to `.env.example` (the project already has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — confirm they exist; only add if missing):

```env
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_STORAGE_BUCKET=recipe-images
```

---

## Step 2: Database — Add `imageUrl` to Recipe

**File:** `prisma/schema.prisma`

Add to the `Recipe` model:

```prisma
imageUrl  String?
```

Run: `npx prisma migrate dev --name add-recipe-image-url`

---

## Step 3: New Utility — `lib/utils/extractRecipeImage.ts`

Detects the recipe image URL from raw HTML using node-html-parser (already a project dependency). Pure DOM parsing — no network calls, no LLM, never throws.

**Detection strategy (priority order):**

1. `<meta property="og:image" content="...">` — covers most food blogs
2. `<script type="application/ld+json">` containing a schema.org `Recipe` object with an `image` property (string or array — take first element if array)

```ts
import { parse } from 'node-html-parser';
import { Logger, type CorrelationId } from '@/lib/infra/Logger';

export function extractRecipeImage(
  html: string,
  correlationId?: CorrelationId,
): string | null {
  // 1. og:image
  // 2. JSON-LD schema.org Recipe image
  // Returns first found URL, or null
  // Never throws — log warn and return null on error
}
```

---

## Step 4: New Utility — `lib/infra/imageStorage.ts`

No new dependencies — uses native `fetch` against the Supabase Storage REST API.

Exports a single function:

```ts
export async function uploadImageFromUrl(
  sourceUrl: string,
  recipeId: string,
): Promise<string | null>
```

Implementation:

1. `fetch(sourceUrl)` with a 10-second timeout (reuse `AbortController` pattern from `fetchHtml.ts`)
2. Validate `Content-Type` header starts with `image/`
3. Derive extension from Content-Type (`image/jpeg` → `.jpg`, `image/png` → `.png`, `image/webp` → `.webp`)
4. Upload via Supabase Storage REST API:
   ```
   PUT ${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/recipes/${recipeId}${ext}
   Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}
   Content-Type: <original content-type>
   x-upsert: true
   Body: image ArrayBuffer
   ```
5. Return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/recipes/${recipeId}${ext}`
6. `try/catch` everything — log warn, return `null` on any failure

---

## Step 5: Extraction Agent — `lib/mas/agents/RecipeExtractionAgent.ts`

After `fetchHtml(url)` (current line 27), call `extractRecipeImage` and attach the result to the response meta. This avoids a second HTML fetch.

```ts
const html = await fetchHtml(url, correlationId);
const imageUrl = extractRecipeImage(html, correlationId);  // ← ADD

// ... existing LLM pipeline unchanged ...

return {
  // ...
  payload: {
    data: result.data,
    meta: { correlationId, imageUrl },  // ← ADD imageUrl to meta
  },
  // ...
};
```

`imageUrl` goes in `meta`, not `data` — it's not part of the LLM-extracted schema.

---

## Step 6: Supervisor — `lib/mas/RecipeSupervisor.ts`

Change the return type of `runExtractionWorkflow()` from:
```ts
Promise<ExtractedRecipe | CuratedRecipe>
```
to:
```ts
Promise<{ recipe: ExtractedRecipe | CuratedRecipe; imageUrl: string | null }>
```

After the extraction agent responds (currently line 88), capture:
```ts
const imageUrl = (extractionResponse.payload.meta?.imageUrl as string | null) ?? null;
```

Return `{ recipe, imageUrl }` from all return paths:
- Curation approved → `{ recipe: curatedRecipe, imageUrl }`
- Curator failed (catch block) → `{ recipe: extractedRecipe, imageUrl }`
- Retries exhausted → `{ recipe: lastExtractedRecipe!, imageUrl }`

---

## Step 7: SSE Types — `lib/types/sse.ts`

Add `'uploading_image'` to the `PipelineStage` union:

```ts
export type PipelineStage =
  | 'fetching'
  | 'extracting'
  | 'curating'
  | 'retrying'
  | 'persisting'
  | 'uploading_image';  // ← ADD
```

---

## Step 8: Service Layer — `lib/services/recipeService.ts`

Add a new method to `RecipeService` after `createRecipe()`:

```ts
async updateRecipeImage(id: string, imageUrl: string): Promise<void> {
  // prisma.recipe.update({ where: { id }, data: { imageUrl } })
  // Log info on success, warn on error — never throw
}
```

---

## Step 9: API Route — `app/api/recipes/extract/route.ts`

The supervisor now returns `{ recipe, imageUrl }`. Update the invocation and add an image upload step between persistence and the final result event:

```ts
const { recipe: result, imageUrl } = await supervisor.runExtractionWorkflow(
  originalUrl,
  onProgress,
);

// 3. Persistence (unchanged)
onProgress('persisting', 'Saving your recipe...');
const recipeService = getRecipeService();
const persistedRecipe = await recipeService.createRecipe(result, originalUrl);

// 4. Image Upload (NEW)
if (imageUrl) {
  onProgress('uploading_image', 'Uploading recipe image...');
  const publicUrl = await uploadImageFromUrl(imageUrl, persistedRecipe.id);
  if (publicUrl) {
    await recipeService.updateRecipeImage(persistedRecipe.id, publicUrl);
    persistedRecipe.imageUrl = publicUrl;
  }
}

// 5. Final Success Event (unchanged)
enqueue({ event: 'result', data: { recipe: persistedRecipe } });
```

Also update `extraction-progress.tsx` (client component) to handle the `'uploading_image'` stage label. Add the label to the dictionaries (en: "Uploading recipe image...", es: "Subiendo imagen de la receta...").

---

## Step 10: UI — `components/recipe-card.tsx`

Add `imageUrl: string | null` to the `RecipeCardRecipe` interface.

Replace the SVG placeholder `<div>` with a conditional:

```tsx
<div className="relative h-40 bg-parchment-dark flex items-center justify-center overflow-hidden">
  {recipe.imageUrl ? (
    <Image
      src={recipe.imageUrl}
      alt={recipe.title}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 33vw"
    />
  ) : (
    <svg ...existing SVG placeholder... />
  )}
</div>
```

Prisma's `findMany` returns all scalar fields by default, so `imageUrl` is already included in `getAllRecipes()` — no query change needed.

---

## Step 11: UI — `components/recipe-detail.tsx`

Read the file first. Add a conditional hero image block near the top of the recipe layout:

```tsx
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
```

---

## Step 12: Next.js Config — `next.config.ts`

Add `images.remotePatterns` to allow serving images from Supabase Storage:

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};
```

---

## Files Summary

### New files to create

| File | Purpose |
|------|---------|
| `lib/utils/extractRecipeImage.ts` | Detect og:image / JSON-LD image from HTML |
| `lib/infra/imageStorage.ts` | Download image and upload to Supabase Storage |

### Files to modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `imageUrl String?` to Recipe model |
| `lib/mas/agents/RecipeExtractionAgent.ts` | Call `extractRecipeImage`, attach to response meta |
| `lib/mas/RecipeSupervisor.ts` | Thread imageUrl through, update return type |
| `lib/types/sse.ts` | Add `'uploading_image'` to PipelineStage |
| `lib/services/recipeService.ts` | Add `updateRecipeImage()` method |
| `app/api/recipes/extract/route.ts` | Add image upload step |
| `app/[lang]/dictionaries/en.json` | Add `uploading_image` label |
| `app/[lang]/dictionaries/es.json` | Add `uploading_image` label (Spanish) |
| `components/extraction-progress.tsx` | Handle `'uploading_image'` stage |
| `components/recipe-card.tsx` | Conditional `<Image>` vs SVG placeholder |
| `components/recipe-detail.tsx` | Add hero image section |
| `next.config.ts` | Add Supabase remotePatterns |
| `.env.example` | Document Supabase Storage env vars |

### Files that stay unchanged

| File | Reason |
|------|---------|
| `docker-compose.yml` | Supabase is external — no local infra changes |
| `package.json` | No new dependencies |
| `lib/mas/agents/RecipeCuratorAgent.ts` | Doesn't touch image data |
| `lib/mas/types/extraction.ts` | imageUrl is in meta, not extraction schema |
| `app/api/recipes/extract/route.e2e.test.ts` | Existing tests still valid; add image upload to tests separately |
| All other lib/mas, prisma, infra files | Unaffected |

---

## Verification

1. Supabase dashboard → `recipe-images` bucket exists with public access
2. Extract a recipe from a food blog known to have og:image (e.g. seriouseats.com) — SSE events should include `uploading_image` stage
3. Supabase dashboard → Storage → `recipe-images/recipes/<id>.jpg` appears
4. Home page → recipe card shows real image, not SVG placeholder
5. Recipe detail page → hero image renders correctly
6. Extract a recipe from a plain-text page (no og:image, no JSON-LD) → SVG placeholder shown, recipe saves normally, no errors
7. `npx prisma studio` → `imageUrl` populated on recipe row with Supabase URL
8. `npx next build` → must pass
