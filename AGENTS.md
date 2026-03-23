<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Project Instructions

You MUST read and follow [docs/DEVELOPER_WORKFLOW.md](./docs/DEVELOPER_WORKFLOW.md) for every coding task.

## Workflow (non-negotiable)

1. **Never commit or push to `main` directly.** Create a feature branch first.
2. **Branch from latest `main`:** `git checkout main && git pull origin main && git checkout -b <type>/<name>`
3. **Conventional commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
4. **The pre-commit hook runs lint and build automatically.** If the commit is rejected, fix the issues and try again.
5. **Push and create a PR:** `git push -u origin <branch> && gh pr create`
6. **Always return the PR URL** to the user when done.

## Tech Stack

- Next.js 16 (App Router, Server Components)
- TypeScript (strict mode)
- Prisma 7 + PostgreSQL 16 (Dockerized)
- Google Gemini (`@google/genai`)
- Tailwind CSS 4

## i18n (English / Spanish)

The app supports two languages (en, es) using a dictionary-based pattern — **no external i18n libraries**.

**Every user-visible string must be translated.** When adding or changing UI text:

1. Add the key to both `app/[lang]/dictionaries/en.json` and `app/[lang]/dictionaries/es.json`.
2. In **server components**, receive `dict` as a prop and use `dict.section.key`.
3. In **client components**, call `useDictionary()` from `@/lib/i18n/dictionary-context`.
4. For internal links, always prefix with the locale: `/${lang}/path`. Use the `lang` prop (server) or `useLocale()` (client).
5. **Recipe metric badges** (servings, prep time, cook time, ingredients) use `getRecipeLabels(recipe.language)` from `lib/i18n/recipeLabels.ts` — these follow the recipe's detected language, NOT the app language.

Key files: `lib/i18n/config.ts`, `lib/i18n/dictionary-context.tsx`, `lib/i18n/locale-context.tsx`, `lib/i18n/recipeLabels.ts`, `app/[lang]/dictionaries.ts`.

## Database

- Schema is in `prisma/schema.prisma`
- Run `npx prisma migrate dev` after schema changes
- Run `npx prisma generate` to regenerate the client
- PostgreSQL runs via `docker compose up db -d`
