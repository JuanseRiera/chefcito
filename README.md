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
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)
- A [Google Gemini API key](https://aistudio.google.com/apikey)

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repo-url> chefcito
cd chefcito
npm install
```

### 2. Configure environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/chefcito?schema=public` |
| `GEMINI_API_KEY` | Your Google Gemini API key | — |

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

## Project Structure

```
chefcito/
├── app/                    # Next.js App Router (pages, layouts, API routes)
│   └── generated/prisma/   # Auto-generated Prisma Client (gitignored)
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Migration history
├── public/                 # Static assets
├── prisma.config.ts        # Prisma configuration
├── next.config.ts          # Next.js configuration (standalone output)
├── docker-compose.yml      # PostgreSQL + App services
├── Dockerfile              # Multi-stage production build
└── .env                    # Environment variables (gitignored)
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Stopping the database

```bash
docker compose down        # Stop containers (data persists in volume)
docker compose down -v     # Stop containers and delete data
```
