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

## Database

- Schema is in `prisma/schema.prisma`
- Run `npx prisma migrate dev` after schema changes
- Run `npx prisma generate` to regenerate the client
- PostgreSQL runs via `docker compose up db -d`
