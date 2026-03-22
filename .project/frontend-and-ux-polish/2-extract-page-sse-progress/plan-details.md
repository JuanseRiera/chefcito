# Implementation Plan: Story 2.2 - Recipe Extraction Page with SSE Progress

## 1. Prerequisites: Dependency Installation

Additional shadcn/ui components are needed.

| Step      | Command                       | Purpose                                   |
| :-------- | :---------------------------- | :---------------------------------------- |
| Add Card  | `npx shadcn@latest add card`  | Card, CardHeader, CardContent, CardFooter |
| Add Input | `npx shadcn@latest add input` | Input field component                     |
| Add Alert | `npx shadcn@latest add alert` | Alert, AlertTitle, AlertDescription       |
| Add Badge | `npx shadcn@latest add badge` | Badge for metadata tags                   |

No npm packages need to be installed — the SSE client uses native `fetch` + `ReadableStream`.

## 2. File & Directory Structure

| File Path                            | Action           | Purpose                                                      |
| :----------------------------------- | :--------------- | :----------------------------------------------------------- |
| `app/extract/page.tsx`               | New              | Client Component page orchestrating the extraction flow      |
| `components/extract-form.tsx`        | New              | URL input form with validation and submit (Client Component) |
| `components/extraction-progress.tsx` | New              | Live SSE stage-by-stage progress display (Client Component)  |
| `components/extraction-result.tsx`   | New              | Success summary card with link to detail (Client Component)  |
| `lib/hooks/use-recipe-extraction.ts` | New              | Custom hook: SSE connection, state machine, event parsing    |
| `components/ui/card.tsx`             | New (via shadcn) | Card components                                              |
| `components/ui/input.tsx`            | New (via shadcn) | Input component                                              |
| `components/ui/alert.tsx`            | New (via shadcn) | Alert components                                             |
| `components/ui/badge.tsx`            | New (via shadcn) | Badge component                                              |

## 3. Type Definitions

### Existing SSE Types (DO NOT redefine — import from `lib/types/sse.ts`)

These are the exact types already defined in the codebase:

```typescript
// lib/types/sse.ts — already exists, import these
export type PipelineStage =
  | 'fetching'
  | 'extracting'
  | 'curating'
  | 'retrying'
  | 'persisting';

export interface ProgressEvent {
  event: 'progress';
  data: {
    stage: PipelineStage;
    message: string;
    attempt?: number;
  };
}

export interface ResultEvent {
  event: 'result';
  data: {
    recipe: Recipe & {
      ingredients: Ingredient[];
      instructionSteps: InstructionStep[];
    };
  };
}

export interface ErrorEvent {
  event: 'error';
  data: {
    code: SSEErrorCode;
    message: string;
  };
}

export type RecipeSSEEvent = ProgressEvent | ResultEvent | ErrorEvent;
```

### New Types for the Hook (defined in `lib/hooks/use-recipe-extraction.ts`)

```typescript
type ExtractionStatus = 'idle' | 'extracting' | 'success' | 'error';

interface CompletedStage {
  stage: PipelineStage;
  message: string;
}

interface ExtractionState {
  status: ExtractionStatus;
  completedStages: CompletedStage[];
  currentStage: { stage: PipelineStage; message: string } | null;
  result: ResultEvent['data']['recipe'] | null;
  error: { code: string; message: string } | null;
}
```

## 4. SSE Wire Format (from the server)

The server (`lib/utils/sseStream.ts`) formats each event as:

```
event: progress\ndata: {"stage":"fetching","message":"Fetching HTML from URL"}\n\n
```

That is: `event: <name>`, newline, `data: <JSON>`, two trailing newlines (`\n\n`) as event boundary. Each event is encoded with `TextEncoder` (UTF-8) and enqueued into a `ReadableStream`.

## 5. Custom Hook: `lib/hooks/use-recipe-extraction.ts`

Complete implementation. This is the most complex piece — handles POST-based SSE streaming, buffered parsing, and state management.

```typescript
'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  PipelineStage,
  RecipeSSEEvent,
  ResultEvent,
} from '@/lib/types/sse';

// ── State Types ──

type ExtractionStatus = 'idle' | 'extracting' | 'success' | 'error';

interface CompletedStage {
  stage: PipelineStage;
  message: string;
}

interface ExtractionState {
  status: ExtractionStatus;
  completedStages: CompletedStage[];
  currentStage: { stage: PipelineStage; message: string } | null;
  result: ResultEvent['data']['recipe'] | null;
  error: { code: string; message: string } | null;
}

const initialState: ExtractionState = {
  status: 'idle',
  completedStages: [],
  currentStage: null,
  result: null,
  error: null,
};

// ── SSE Parser ──

/**
 * Parses complete SSE events from a text buffer.
 * Returns parsed events and any remaining incomplete text.
 *
 * Wire format per event:
 *   event: <name>\ndata: <JSON>\n\n
 *
 * Events are separated by double newlines (\n\n).
 */
function parseSSEBuffer(buffer: string): {
  events: RecipeSSEEvent[];
  remaining: string;
} {
  const events: RecipeSSEEvent[] = [];

  // Split on double newline to find complete event blocks
  const parts = buffer.split('\n\n');

  // The last part may be incomplete (no trailing \n\n yet)
  const remaining = parts.pop() ?? '';

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    let eventName: string | null = null;
    let eventData: string | null = null;

    const lines = trimmed.split('\n');
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventName = line.slice('event: '.length);
      } else if (line.startsWith('data: ')) {
        eventData = line.slice('data: '.length);
      }
    }

    if (eventName && eventData) {
      try {
        const parsed = JSON.parse(eventData);
        events.push({ event: eventName, data: parsed } as RecipeSSEEvent);
      } catch {
        // Skip malformed JSON — should not happen with our server
      }
    }
  }

  return { events, remaining };
}

// ── Hook ──

export function useRecipeExtraction() {
  const [state, setState] = useState<ExtractionState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const extract = useCallback(async (url: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({
      status: 'extracting',
      completedStages: [],
      currentStage: null,
      result: null,
      error: null,
    });

    try {
      const response = await fetch('/api/recipes/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: {
            code: 'NETWORK_ERROR',
            message: `Server returned ${response.status}`,
          },
        }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const { events, remaining } = parseSSEBuffer(buffer);
        buffer = remaining;

        for (const event of events) {
          switch (event.event) {
            case 'progress':
              setState((prev) => ({
                ...prev,
                completedStages: prev.currentStage
                  ? [
                      ...prev.completedStages,
                      {
                        stage: prev.currentStage.stage,
                        message: prev.currentStage.message,
                      },
                    ]
                  : prev.completedStages,
                currentStage: {
                  stage: event.data.stage,
                  message: event.data.message,
                },
              }));
              break;

            case 'result':
              setState((prev) => ({
                ...prev,
                status: 'success',
                currentStage: null,
                completedStages: prev.currentStage
                  ? [
                      ...prev.completedStages,
                      {
                        stage: prev.currentStage.stage,
                        message: prev.currentStage.message,
                      },
                    ]
                  : prev.completedStages,
                result: event.data.recipe,
              }));
              break;

            case 'error':
              setState((prev) => ({
                ...prev,
                status: 'error',
                currentStage: null,
                error: {
                  code: event.data.code,
                  message: event.data.message,
                },
              }));
              break;
          }
        }
      }
    } catch (err) {
      // AbortError is expected when the user navigates away or resets
      if ((err as Error).name !== 'AbortError') {
        setState((prev) => ({
          ...prev,
          status: 'error',
          currentStage: null,
          error: {
            code: 'NETWORK_ERROR',
            message: 'Failed to connect to the server. Please try again.',
          },
        }));
      }
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  return { ...state, extract, reset };
}
```

## 6. Component Implementations

### `app/extract/page.tsx` (Client Component)

```typescript
'use client';

import { useRecipeExtraction } from '@/lib/hooks/use-recipe-extraction';
import { ExtractForm } from '@/components/extract-form';
import { ExtractionProgress } from '@/components/extraction-progress';
import { ExtractionResult } from '@/components/extraction-result';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function ExtractPage() {
  const {
    status,
    completedStages,
    currentStage,
    result,
    error,
    extract,
    reset,
  } = useRecipeExtraction();

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-serif text-3xl text-charcoal mb-2">
        Extract a Recipe
      </h1>
      <p className="text-brown-light mb-8">
        Paste a recipe URL and we&apos;ll format it for you.
      </p>

      {/* Form — shown in idle, extracting, and error states */}
      {status !== 'success' && (
        <ExtractForm
          onSubmit={extract}
          isLoading={status === 'extracting'}
        />
      )}

      {/* Error alert */}
      {status === 'error' && error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Extraction Failed</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={reset}
          >
            Try Again
          </Button>
        </Alert>
      )}

      {/* Live progress */}
      {status === 'extracting' && (
        <ExtractionProgress
          completedStages={completedStages}
          currentStage={currentStage}
        />
      )}

      {/* Success result */}
      {status === 'success' && result && (
        <ExtractionResult recipe={result} onExtractAnother={reset} />
      )}
    </div>
  );
}
```

### `components/extract-form.tsx` (Client Component)

```typescript
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ExtractFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function ExtractForm({ onSubmit, isLoading }: ExtractFormProps) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(
    null,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = url.trim();

    if (!trimmed) {
      setValidationError('Please enter a URL.');
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setValidationError('Please enter a valid URL (e.g., https://example.com/recipe).');
      return;
    }

    setValidationError(null);
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (validationError) setValidationError(null);
          }}
          placeholder="https://example.com/recipe"
          disabled={isLoading}
          className="w-full"
          aria-label="Recipe URL"
        />
        {validationError && (
          <p className="text-error text-sm mt-1">{validationError}</p>
        )}
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Extracting...' : 'Extract Recipe'}
      </Button>
    </form>
  );
}
```

### `components/extraction-progress.tsx` (Client Component)

```typescript
'use client';

import type { PipelineStage } from '@/lib/types/sse';

interface CompletedStage {
  stage: PipelineStage;
  message: string;
}

interface ExtractionProgressProps {
  completedStages: CompletedStage[];
  currentStage: { stage: PipelineStage; message: string } | null;
}

/**
 * Maps pipeline stages to user-friendly display labels.
 */
const stageLabels: Record<PipelineStage, string> = {
  fetching: 'Fetching recipe...',
  extracting: 'Extracting ingredients...',
  curating: 'Reviewing quality...',
  retrying: 'Re-extracting...',
  persisting: 'Saving recipe...',
};

export function ExtractionProgress({
  completedStages,
  currentStage,
}: ExtractionProgressProps) {
  return (
    <div className="mt-8 space-y-3">
      {/* Completed stages */}
      {completedStages.map((stage, i) => (
        <div key={i} className="flex items-center gap-3">
          {/* Checkmark icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-success shrink-0"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-brown-light">
            {stageLabels[stage.stage] ?? stage.message}
          </span>
        </div>
      ))}

      {/* Current (active) stage */}
      {currentStage && (
        <div className="flex items-center gap-3">
          {/* Spinning indicator */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gold animate-spin shrink-0"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-brown font-medium">
            {stageLabels[currentStage.stage] ?? currentStage.message}
          </span>
        </div>
      )}
    </div>
  );
}
```

### `components/extraction-result.tsx` (Client Component)

```typescript
'use client';

import Link from 'next/link';
import type { ResultEvent } from '@/lib/types/sse';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ExtractionResultProps {
  recipe: ResultEvent['data']['recipe'];
  onExtractAnother: () => void;
}

export function ExtractionResult({
  recipe,
  onExtractAnother,
}: ExtractionResultProps) {
  return (
    <div className="mt-8">
      <p className="text-success font-medium mb-4">
        Recipe extracted successfully!
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl text-charcoal">
            {recipe.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recipe.description && (
            <p className="text-brown-light line-clamp-3 mb-4">
              {recipe.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {recipe.servings != null && (
              <Badge variant="secondary">
                {recipe.servings} servings
              </Badge>
            )}
            {recipe.prepTime != null && (
              <Badge variant="secondary">
                {recipe.prepTime} min prep
              </Badge>
            )}
            {recipe.cookTime != null && (
              <Badge variant="secondary">
                {recipe.cookTime} min cook
              </Badge>
            )}
            <Badge variant="secondary">
              {recipe.ingredients.length} ingredients
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 items-stretch sm:flex-row sm:items-center">
          <Button asChild className="flex-1">
            <Link href={`/recipes/${recipe.id}`}>View Full Recipe</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={onExtractAnother}
            className="text-brown-light"
          >
            Extract another
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

## 7. Constraints & Decisions

- **POST SSE:** The extraction API at `POST /api/recipes/extract` returns `Content-Type: text/event-stream`. `EventSource` only supports GET, so we use `fetch` + `ReadableStream.getReader()`.
- **Type reuse:** All SSE types are imported from `lib/types/sse.ts`. Do NOT redefine `PipelineStage`, `ProgressEvent`, `ResultEvent`, `ErrorEvent`, or `RecipeSSEEvent`.
- **No API changes:** The existing endpoint is used as-is. No modifications needed.
- **AbortController:** Cancels the fetch when the user navigates away or calls `reset()`. The `AbortError` is caught and silently ignored.
- **Buffer management:** SSE chunks may arrive split across `reader.read()` calls. The parser splits on `\n\n` boundaries and keeps the last (potentially incomplete) part as the remaining buffer for the next iteration.
- **Multiple events per chunk:** A single `reader.read()` may contain multiple complete events. The parser handles this by iterating over all parts split by `\n\n`.
- **State transitions:** On each `progress` event, the current stage is moved to `completedStages` before the new stage becomes current. On `result` or `error`, `currentStage` is moved to completed (for result) and then set to null.
- **No icon library:** SVG icons are inlined to avoid adding a dependency. The spinner uses `animate-spin` from Tailwind.

## 8. Verification Checklist

- [ ] shadcn Card, Input, Alert, Badge components installed in `components/ui/`
- [ ] `/extract` page renders with "Extract a Recipe" heading and URL input form
- [ ] Empty URL submission shows "Please enter a URL." validation error below input
- [ ] Invalid URL (e.g., "not a url") shows "Please enter a valid URL" validation error
- [ ] Submit button text changes to "Extracting..." and is disabled during extraction
- [ ] Submitting a valid recipe URL initiates fetch to `POST /api/recipes/extract`
- [ ] Progress stages appear one by one: checkmark (green) for completed, spinner (gold) for current
- [ ] Stage labels are user-friendly (not raw stage names like "curating")
- [ ] On `result` event: progress hides, success message + card with title, description, badges, and links appear
- [ ] "View Full Recipe" link has correct href (`/recipes/{id}`)
- [ ] "Extract another" button resets the form to idle state
- [ ] On `error` event: destructive alert with error message and "Try Again" button
- [ ] "Try Again" resets to idle state
- [ ] Navigating away mid-extraction cancels the fetch (no console errors about state updates after unmount)
- [ ] Mobile: form and progress are full-width, centered
- [ ] `npm run build` passes with zero errors
