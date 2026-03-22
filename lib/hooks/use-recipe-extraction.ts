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
