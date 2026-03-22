# Global Plan: Feature 2.2 - Frontend & UX Polish (Mobile-First)

## 1. Goal

Deliver a responsive, mobile-first user interface for the Chefcito cooking app. This includes establishing the app's visual identity (classic Italian restaurant aesthetic), building the recipe extraction page with live SSE progress, a recipe list home page, and a full recipe detail view. All pages include skeleton loaders, error handling, and responsive design.

## 2. Design System

### Color Palette (classic Italian trattoria — warm, rustic, candlelit)

| Token            | Hex       | Usage                                                        |
| ---------------- | --------- | ------------------------------------------------------------ |
| `parchment`      | `#FAF3E8` | Page background                                              |
| `parchment-dark` | `#F0E6D3` | Card borders, hover backgrounds                              |
| `cream`          | `#FFF8EF` | Input backgrounds, light contrast areas                      |
| `brown`          | `#5C3D2E` | Primary text, headings                                       |
| `brown-light`    | `#8B6F5E` | Secondary/muted text                                         |
| `burgundy`       | `#722F37` | Primary accent — buttons, active nav, CTAs                   |
| `burgundy-dark`  | `#5A1F27` | Button hover/active states                                   |
| `gold`           | `#C5952B` | Highlight — icons, badges, step numbers, progress indicators |
| `gold-light`     | `#D4AA4F` | Hover highlights                                             |
| `charcoal`       | `#2D2A26` | Darkest text (recipe titles on detail page)                  |
| `error`          | `#B33A3A` | Error states                                                 |
| `success`        | `#4A7C59` | Success states                                               |

Light mode only — no dark mode support.

### Typography

- **Headings:** `Playfair Display` (Google Font) — elegant serif with Italian restaurant character
- **Body:** `Geist Sans` (already configured) — clean, readable sans-serif
- **Mono:** `Geist Mono` (already configured) — for times, quantities

### Component Library

- **shadcn/ui** — copy-paste components built on Radix UI + Tailwind CSS
- Configured for Tailwind CSS v4 (no `tailwind.config` file)

## 3. Phased Approach

### Story 2.1: Foundation — shadcn/ui, Theme, Layout & Navigation

Establish the design system, install shadcn/ui, define colors and typography, build the sticky navbar with responsive mobile menu, footer, and error/404 pages. Replace the default Next.js placeholder.

### Story 2.2: Recipe Extraction Page with SSE Progress

Build the `/extract` page with URL input form, live SSE progress visualization (fetching → extracting → curating → persisting), success result card, and error handling.

### Story 2.3: Recipe Read API (Backend)

Add `getAllRecipes()` and `getRecipeById()` methods to `RecipeService`. Pure backend story — no UI changes. Required by Stories 2.4 and 2.5.

### Story 2.4: Recipe List Home Page

Build the home page (`/`) with a responsive grid of recipe cards. Each card shows title, description, cook time, ingredient count, and an image placeholder for future use. Includes skeleton loading state and empty state.

### Story 2.5: Recipe Detail Page

Build `/recipes/[id]` with full recipe display: title, metadata bar, author attribution, categorized ingredient list, and numbered instruction steps. Includes skeleton loading and not-found handling.

## 4. Component Architecture

```
RootLayout (Server)
├── Navbar (Server)
│   └── MobileNav (Client) — hamburger toggle
├── {children}
│   ├── Home `/` (Server)
│   │   └── RecipeCardGrid (Server)
│   │       └── RecipeCard (Server) × N
│   ├── Extract `/extract` (Client)
│   │   ├── ExtractForm (Client)
│   │   ├── ExtractionProgress (Client)
│   │   └── ExtractionResult (Client)
│   ├── Recipe Detail `/recipes/[id]` (Server)
│   │   └── RecipeDetail (Server)
│   │       ├── IngredientList (Server)
│   │       └── InstructionSteps (Server)
│   ├── NotFound (Server)
│   └── Error (Client)
└── Footer (Server)
```

## 5. Critical First Steps

1. Initialize shadcn/ui and configure for Tailwind v4.
2. Define the full color palette and typography in `globals.css`.
3. Build the root layout shell (Navbar + Footer).

## 6. Success Metrics

- **Visual Consistency:** All pages follow the Italian restaurant aesthetic.
- **Responsiveness:** All pages work on mobile (375px) through desktop.
- **Loading UX:** Every data-fetching page has skeleton loaders.
- **Error Handling:** Graceful error states on all pages.
- **Build:** `npm run build` passes after each story.

## 7. Out of Scope (For this feature)

- Dark mode
- Recipe images (placeholder only — images will be added in a future feature)
- Recipe editing or personalization (Feature 2.3)
- Search functionality (Feature 2.2 in PRD — ingredient-based search)
- Meal planning UI
- Authentication
