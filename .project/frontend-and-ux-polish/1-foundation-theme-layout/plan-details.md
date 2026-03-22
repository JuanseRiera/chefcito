# Implementation Plan: Story 2.1 - Foundation — shadcn/ui, Theme, Layout & Navigation

## 1. Prerequisites: Dependency Installation

shadcn/ui must be initialized, which will install its required dependencies automatically (`clsx`, `tailwind-merge`, `class-variance-authority`, etc.).

| Step           | Command                          | Purpose                                                                                    |
| :------------- | :------------------------------- | :----------------------------------------------------------------------------------------- |
| Init shadcn/ui | `npx shadcn@latest init`         | Scaffolds `components/ui/`, `lib/utils.ts` (cn helper). Detects Tailwind v4 automatically. |
| Add Button     | `npx shadcn@latest add button`   | Button component                                                                           |
| Add Skeleton   | `npx shadcn@latest add skeleton` | Skeleton loading component                                                                 |

**During `shadcn init`:** Select TypeScript, the default style, and CSS variables approach. The init will detect Tailwind v4 from `@tailwindcss/postcss` in `postcss.config.mjs`. If it generates a `tailwind.config.ts`, delete it — all config stays in CSS.

## 2. File & Directory Structure

| File Path                    | Action           | Purpose                                                                         |
| :--------------------------- | :--------------- | :------------------------------------------------------------------------------ |
| `app/globals.css`            | Modified         | Full theme: color palette in `@theme inline`, shadcn CSS vars, remove dark mode |
| `app/layout.tsx`             | Modified         | Add Playfair Display font, update metadata, add Navbar + Footer                 |
| `app/page.tsx`               | Modified         | Replace default placeholder with empty state                                    |
| `app/not-found.tsx`          | New              | Custom 404 page                                                                 |
| `app/error.tsx`              | New              | Error boundary (Client Component)                                               |
| `app/global-error.tsx`       | New              | Global error fallback (Client Component)                                        |
| `components/navbar.tsx`      | New              | Sticky top bar with logo and desktop nav links (Server Component)               |
| `components/mobile-nav.tsx`  | New              | Hamburger menu for mobile (Client Component)                                    |
| `components/footer.tsx`      | New              | Simple footer (Server Component)                                                |
| `lib/utils.ts`               | New (via shadcn) | `cn()` helper for className merging                                             |
| `components/ui/button.tsx`   | New (via shadcn) | Button component                                                                |
| `components/ui/skeleton.tsx` | New (via shadcn) | Skeleton component                                                              |

## 3. Theme Definition: `app/globals.css`

This replaces the current file entirely. The existing file has:

- `@import 'tailwindcss'`
- `:root` with `--background: #ffffff` / `--foreground: #171717`
- `@theme inline` with `--color-background`, `--color-foreground`, `--font-sans`, `--font-mono`
- `@media (prefers-color-scheme: dark)` block (must be removed)
- `body` rule with `font-family: Arial`

Replace with:

```css
@import 'tailwindcss';

@theme inline {
  /* ── Color Palette: Classic Italian Trattoria ── */
  --color-parchment: #faf3e8;
  --color-parchment-dark: #f0e6d3;
  --color-cream: #fff8ef;
  --color-brown: #5c3d2e;
  --color-brown-light: #8b6f5e;
  --color-burgundy: #722f37;
  --color-burgundy-dark: #5a1f27;
  --color-gold: #c5952b;
  --color-gold-light: #d4aa4f;
  --color-charcoal: #2d2a26;
  --color-error: #b33a3a;
  --color-success: #4a7c59;

  /* ── Semantic aliases (shadcn/ui reads these) ── */
  --color-background: var(--color-parchment);
  --color-foreground: var(--color-brown);
  --color-primary: var(--color-burgundy);
  --color-primary-foreground: #fff8ef;
  --color-secondary: var(--color-parchment-dark);
  --color-secondary-foreground: var(--color-brown);
  --color-muted: var(--color-parchment-dark);
  --color-muted-foreground: var(--color-brown-light);
  --color-accent: var(--color-gold);
  --color-accent-foreground: var(--color-charcoal);
  --color-destructive: var(--color-error);
  --color-border: var(--color-parchment-dark);
  --color-input: var(--color-parchment-dark);
  --color-ring: var(--color-burgundy);
  --color-card: var(--color-cream);
  --color-card-foreground: var(--color-brown);

  /* ── Typography ── */
  --font-serif: var(--font-playfair);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* ── Border radius (shadcn default) ── */
  --radius: 0.5rem;
}

body {
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
  background-color: var(--color-background);
  color: var(--color-foreground);
}
```

**Critical notes:**

- The `@media (prefers-color-scheme: dark)` block is completely removed (light only).
- The shadcn semantic variables (`--color-primary`, `--color-card`, `--color-border`, etc.) are mapped to the Italian palette. Without these, shadcn components will have no styling. These variable names are what shadcn components reference internally.
- The `--radius` variable controls border-radius for all shadcn components.
- Colors defined with `--color-*` prefix become Tailwind utilities: `bg-parchment`, `text-burgundy`, `border-parchment-dark`, etc.

## 4. Layout: `app/layout.tsx`

The current file imports `Geist` and `Geist_Mono` from `next/font/google` (NOT local fonts). We add `Playfair_Display` the same way.

```typescript
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Chefcito',
  description: 'Your AI-powered cooking companion',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-parchment text-brown">
        <Navbar />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
```

**Key details:**

- `Geist` and `Geist_Mono` are imported from `next/font/google` — this is the existing pattern, do NOT change to `next/font/local`.
- `Playfair_Display` is added alongside them.
- All three font variables are set on `<html>` so they cascade to all elements.
- `--font-playfair` is referenced in `globals.css` as `--font-serif: var(--font-playfair)`.
- `bg-parchment text-brown` on `<body>` sets the global background and text color.
- `max-w-5xl mx-auto` on `<main>` constrains content width on desktop.
- `flex-1` on `<main>` ensures the footer stays at the bottom.

## 5. Component Implementations

### `components/navbar.tsx` (Server Component)

```typescript
import Link from 'next/link';
import { MobileNav } from './mobile-nav';

const navLinks = [
  { href: '/', label: 'My Recipes' },
  { href: '/extract', label: 'Extract Recipe' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-parchment border-b border-parchment-dark">
      <nav className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-serif text-2xl text-charcoal">
          Chefcito
        </Link>

        {/* Desktop nav links — hidden on mobile */}
        <ul className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-brown-light hover:text-burgundy transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger — visible only on mobile */}
        <div className="md:hidden">
          <MobileNav links={navLinks} />
        </div>
      </nav>
    </header>
  );
}
```

### `components/mobile-nav.tsx` (Client Component)

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface MobileNavProps {
  links: { href: string; label: string }[];
}

export function MobileNav({ links }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-brown hover:text-burgundy"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          // X icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          // Hamburger icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-parchment border-b border-parchment-dark shadow-md z-40">
          <ul className="flex flex-col py-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-brown-light hover:text-burgundy hover:bg-parchment-dark transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
```

### `components/footer.tsx` (Server Component)

```typescript
export function Footer() {
  return (
    <footer className="border-t border-parchment-dark py-6 mt-auto">
      <div className="max-w-5xl mx-auto px-4 text-center text-brown-light text-sm">
        <span className="font-serif">Chefcito</span> — Your AI-powered
        cooking companion
      </div>
    </footer>
  );
}
```

### `app/page.tsx` (Temporary Empty State)

This will be replaced in Story 2.4 with the recipe grid. For now, shows an empty state.

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
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
```

### `app/not-found.tsx` (Server Component)

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-serif text-3xl text-charcoal mb-4">
        Page Not Found
      </h1>
      <p className="text-brown-light mb-8 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
```

### `app/error.tsx` (Client Component)

```typescript
'use client';

import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-serif text-3xl text-charcoal mb-4">
        Something went wrong
      </h1>
      <p className="text-brown-light mb-8 max-w-md">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <Button onClick={reset} variant="outline">
        Try Again
      </Button>
    </div>
  );
}
```

### `app/global-error.tsx` (Client Component)

```typescript
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-parchment text-brown">
        <h1 className="text-3xl mb-4">Something went wrong</h1>
        <p className="text-brown-light mb-8">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-burgundy text-white rounded hover:bg-burgundy-dark transition-colors"
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
```

**Note:** `global-error.tsx` wraps its own `<html>` and `<body>` because it replaces the root layout on error. It cannot use shadcn Button since the layout (and its font/theme providers) may have failed.

## 6. Constraints & Decisions

- **Tailwind v4:** No `tailwind.config.ts` file exists or should be created. All config lives in `globals.css` via `@import 'tailwindcss'` and `@theme inline`. The `postcss.config.mjs` uses `@tailwindcss/postcss` plugin.
- **shadcn/ui CSS variables:** shadcn components reference semantic variables like `--color-primary`, `--color-card`, `--color-border`, etc. These MUST be defined in `@theme inline` and mapped to the Italian palette. Without them, shadcn components render unstyled.
- **Light only:** No `prefers-color-scheme: dark` media query. No `dark:` variant classes anywhere.
- **Fonts from Google:** The existing Geist fonts use `next/font/google` (NOT `next/font/local`). Playfair Display is added the same way. There is no `app/fonts/` directory.
- **`font-serif` utility:** After defining `--font-serif: var(--font-playfair)` in `@theme inline`, the Tailwind class `font-serif` applies Playfair Display. Use this on all headings.
- **Prettier:** All files must conform to: semi, singleQuote, trailingComma: "all", tabWidth: 2, printWidth: 80.
- **Next.js 16:** Check `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` for any changes to error boundary signatures. The current plan uses the standard `{ error, reset }` props.

## 7. Verification Checklist

- [ ] `npx shadcn@latest init` completes without errors
- [ ] No `tailwind.config.ts` file was created (if it was, delete it)
- [ ] `components/ui/button.tsx` and `components/ui/skeleton.tsx` exist after `shadcn add`
- [ ] `lib/utils.ts` with `cn()` helper exists
- [ ] `globals.css` contains full color palette in `@theme inline` (13 palette colors + 14 shadcn semantic vars)
- [ ] No `@media (prefers-color-scheme: dark)` block exists in `globals.css`
- [ ] Playfair Display font loads in the browser (verify in Network tab: Google Fonts request)
- [ ] `font-serif` class applies Playfair Display to text
- [ ] `bg-parchment`, `text-burgundy`, `text-gold`, `border-parchment-dark` work as Tailwind classes
- [ ] shadcn `<Button>` renders with burgundy background and cream text
- [ ] Navbar is sticky at top of viewport
- [ ] Navbar shows "Chefcito" logo (serif font) + 2 links on desktop (≥768px)
- [ ] Navbar collapses to hamburger icon on mobile (<768px)
- [ ] Tapping hamburger opens dropdown with links; tapping a link closes it
- [ ] Footer renders at page bottom with top border
- [ ] Home page shows "Your Recipe Collection" heading + "Extract a Recipe" CTA button
- [ ] CTA button navigates to `/extract`
- [ ] `/nonexistent` shows custom 404 page with "Back to Home" button
- [ ] Page title in browser tab is "Chefcito"
- [ ] `npm run build` passes with zero errors
