# Chefcito

AI-powered cooking assistant that extracts, formats, and manages recipes using a multi-agent system with Google Gemini.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Database:** PostgreSQL 16 via Docker
- **ORM:** Prisma 7
- **AI:** Google Gemini (`@google/genai`)
- **Styling:** Tailwind CSS 4

## Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [GitHub CLI (gh)](https://cli.github.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)
- A [Google Gemini API key](https://aistudio.google.com/apikey)

## Getting Started

Refer to the [Developer Workflow](./docs/DEVELOPER_WORKFLOW.md) for detailed instructions on the standardized process for this repository, including branch creation, Pull Request guidelines, and other relevant information.

### 1. Clone and install dependencies

```bash
git clone <repo-url> chefcito
cd chefcito
npm install
git config core.hooksPath .githooks
```

The last command activates the shared git hooks (e.g., prevents direct pushes to `main`).

### 2. Configure environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

| Variable         | Description                  | Default                                                                |
| ---------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/chefcito?schema=public` |
| `GEMINI_API_KEY` | Your Google Gemini API key   | —                                                                      |

### 3. Start the database

```bash
docker compose up db -d
```

This starts a PostgreSQL 16 container on port `5432` with a persistent volume.

### 4. Run database migrations

```bash
npx prisma migrate dev
```

This applies all migrations and generates the Prisma Client.

### 5. Start the dev server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Running with Docker (full stack)

To run both the app and database in containers:

```bash
docker compose up --build
```

The app container reads `GEMINI_API_KEY` from your `.env` file. The `DATABASE_URL` is set automatically to point to the `db` service.

## Database Schema

Three models defined in `prisma/schema.prisma`:

- **Recipe** — title, description, original URL, author, servings, prep/cook time
- **Ingredient** — name, quantity, unit, category (belongs to Recipe)
- **InstructionStep** — step number, instruction text (belongs to Recipe)

### Useful Prisma commands

```bash
npx prisma studio          # Visual database browser (http://localhost:5555)
npx prisma migrate dev     # Apply pending migrations + regenerate client
npx prisma generate        # Regenerate Prisma Client without migrating
npx prisma migrate reset   # Drop all data and re-apply all migrations
```

## Frontend Pages

Once the dev server is running at [http://localhost:3000](http://localhost:3000), the following pages are available:

| Route | Description |
| --- | --- |
| `/` | **Home** — Lists all saved recipes as cards. Shows an empty state with a link to extract your first recipe if none exist. |
| `/extract` | **Extract a Recipe** — Paste a recipe URL and watch real-time progress as the AI fetches, extracts, and saves the recipe. Uses server-sent events (SSE) to stream pipeline stages. |
| `/recipes/[id]` | **Recipe Detail** — Full recipe view with ingredients grouped by category, numbered instruction steps, metadata badges, and a link to the original source. |

### Typical workflow

1. Go to `/extract` and paste a URL from a cooking website
2. Watch the extraction progress (fetching → extracting → reviewing → saving)
3. When complete, click "View Full Recipe" to see the formatted result
4. Return to `/` to see the recipe in your collection

## Project Structure

```
chefcito/
├── app/                    # Next.js App Router
│   ├── extract/            # Recipe extraction page (client component, SSE)
│   ├── recipes/[id]/       # Recipe detail page (server component)
│   └── api/recipes/        # API routes (extract endpoint)
├── components/             # Shared React components
│   └── ui/                 # shadcn/ui primitives (button, card, badge, etc.)
├── lib/
│   ├── hooks/              # Custom React hooks (useRecipeExtraction)
│   ├── services/           # Data access layer (RecipeService)
│   ├── mas/                # Multi-agent system (Gemini-powered extraction)
│   ├── db/                 # Prisma client singleton
│   ├── types/              # Shared TypeScript types (SSE events, exceptions)
│   └── utils/              # Utility functions
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Migration history
├── tests/helpers/          # Shared test utilities
├── docker-compose.yml      # PostgreSQL + App services
├── Dockerfile              # Multi-stage production build
└── .env                    # Environment variables (gitignored)
```

## Scripts

| Command                | Description                            |
| ---------------------- | -------------------------------------- |
| `npm run dev`          | Start dev server with Turbopack        |
| `npm run build`        | Production build                       |
| `npm run start`        | Start production server                |
| `npm run lint`         | Run ESLint                             |
| `npm run format`       | Format all files with Prettier         |
| `npm run format:check` | Check formatting without writing       |
| `npm test`             | Run all tests once                     |
| `npm run test:watch`   | Re-run tests on file changes           |
| `npm run test:coverage`| Run tests with V8 coverage report      |

## Stopping the database

```bash
docker compose down        # Stop containers (data persists in volume)
docker compose down -v     # Stop containers and delete data
```
