# Developer Workflow

This document outlines the standard development process for this repository. It is mandatory for both human developers and AI coding assistants (Claude Code, GitHub Copilot, Cursor, etc.).

## Prerequisites

All developers must have the [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated:

```bash
gh auth login
```

---

## Golden Rules

1. **Never push directly to `main`.** All changes go through Pull Requests. A `pre-push` hook enforces this locally.
2. **One feature/fix per branch.** Keep branches focused and short-lived.
3. **Lint and build run automatically on every commit** via a `pre-commit` hook. Failures block the commit until fixed.
4. **Squash merge** all PRs into `main` for a clean linear history.

---

## Branching Strategy

This project uses **trunk-based development** with short-lived feature branches.

```
main (protected, always deployable)
 ├── feat/recipe-extraction
 ├── fix/ingredient-parsing
 └── docs/update-readme
```

- `main` is the single source of truth. It should always be in a deployable state.
- All work happens on feature branches created from the latest `main`.
- Feature branches are merged back to `main` exclusively via Pull Request.
- After merge, the feature branch is deleted.

---

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>
```

### Types

| Prefix     | Use when...                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | Adding new functionality                                |
| `fix`      | Fixing a bug                                            |
| `docs`     | Documentation only                                      |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or updating tests                                |
| `chore`    | Tooling, config, dependencies, CI                       |

### Examples

```
feat: add recipe extraction API endpoint
fix: handle missing author field in parsed HTML
docs: add Docker setup instructions to README
chore: upgrade Prisma to v7.6
```

- Keep the subject line under 70 characters.
- Use the imperative mood ("add", not "added" or "adds").
- A body is optional but encouraged for non-trivial changes.

---

## PR Merge Strategy

All PRs are **squash merged** into `main`. This means:

- The full branch commit history is collapsed into a single commit on `main`.
- The PR title becomes the commit message on `main`, so write it as a conventional commit (e.g., `feat: add recipe extraction`).
- This keeps `git log --oneline` on `main` clean and scannable.

Configure this in GitHub: **Settings → General → Pull Requests → Allow squash merging** (disable the other two).

---

## Development Flow

### 1. Sync and branch

```bash
git checkout main && git pull origin main
git checkout -b <type>/<kebab-case-description>
```

Branch name examples: `feat/recipe-extraction`, `fix/null-servings`, `docs/api-reference`.

### 2. Implement

- Write the code and any necessary tests.
- The `pre-commit` hook automatically runs `npm run lint` and `npm run build` on every commit. If either fails, the commit is rejected until you fix the issues.

### 3. Commit and push

```bash
git add <files>
git commit -m "<type>: <description>"
git push -u origin <branch-name>
```

### 4. Create a Pull Request

Use the `gh` CLI. The repo has a PR template that will auto-populate the body structure.

```bash
gh pr create --title "<type>: <description>" --body "$(cat <<'EOF'
## Summary
- <what changed and why>

## Test Plan
- [ ] <how to verify>
EOF
)"
```

### 5. Review and merge

- Verify CI checks pass (lint, type-check, build).
- Review the diff.
- Squash merge via GitHub.
- Delete the feature branch.

### 6. Notify

If an AI assistant performed the work, it must inform the user with the PR URL.

---

## Testing

The project uses [Vitest](https://vitest.dev/) for unit, integration, and end-to-end tests. Integration and E2E tests run against a real PostgreSQL database; all LLM calls are mocked — no Gemini API key is needed.

### First-time setup

1. **Create `.env.test`** from the provided example:

   ```bash
   cp .env.test.example .env.test
   ```

   This file is gitignored. It contains:

   | Variable         | Value                                                         | Purpose                                                                                                            |
   | ---------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
   | `DATABASE_URL`   | `postgresql://postgres:postgres@localhost:5432/chefcito_test` | Points tests at the `chefcito_test` database so your development data in `chefcito` is never touched.              |
   | `GEMINI_API_KEY` | `fake-test-api-key-not-used-in-tests`                         | Placeholder so modules that read this env var at import time don't throw. All LLM calls are mocked — no API usage. |
   | `NODE_ENV`       | `test`                                                        | Standard Node test flag.                                                                                           |

2. **Start the database** and **create the test DB**:

   ```bash
   docker compose up db -d
   npm run test:db:setup
   ```

   `test:db:setup` creates the `chefcito_test` database and runs all Prisma migrations against it. You only need to run this once (or again after adding new migrations).

### Running tests

```bash
npm test              # run all tests once
npm run test:watch    # re-run on file changes
npm run test:coverage # run with V8 coverage report
```

### How `.env.test` is loaded

`tests/setup.ts` is configured as a Vitest setup file. It calls `dotenv.config({ path: '.env.test', override: true })` **before** any test module is imported. This ensures `DATABASE_URL` is set to the test database before `lib/db/prisma.ts` initializes its singleton `PrismaClient`. The `override: true` flag means `.env.test` values take precedence over any variables already in your shell environment.

### Test architecture

| Layer           | Directory            | What's mocked                 | What's real           |
| --------------- | -------------------- | ----------------------------- | --------------------- |
| **Unit**        | `tests/unit/`        | LLM, fetch, utility functions | The module under test |
| **Integration** | `tests/integration/` | LLM, agents                   | Supervisor, DB        |
| **E2E**         | `tests/e2e/`         | RecipeSupervisor              | Route handler, DB     |

---

## For AI Coding Assistants

If you are an AI agent (Claude Code, GitHub Copilot, Cursor, or similar) performing a coding task:

1. **You MUST follow this workflow.** Never commit directly to `main`.
2. **Always create a feature branch** from the latest `main` before making changes.
3. **Always create a PR** using `gh pr create` when your work is complete.
4. **Always provide the PR URL** to the user when done.
5. **The pre-commit hook runs lint and build automatically.** If the commit is rejected, fix the issues and try again.
6. **Use conventional commit messages** as described above.
7. **Read the PR template** — your PR body should follow its structure.
