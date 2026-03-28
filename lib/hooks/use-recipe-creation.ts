'use client';

import { useState, useCallback } from 'react';
import type { CreateFromTextResponse } from '@/lib/mas/types/recipeCreation';
import { useLocale } from '@/lib/i18n/locale-context';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type CreationStatus = 'idle' | 'loading' | 'asking' | 'success' | 'error';

export interface UseRecipeCreationReturn {
  messages: ChatMessage[];
  status: CreationStatus;
  recipeId: string | null;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  reset: () => void;
}

export function useRecipeCreation(): UseRecipeCreationReturn {
  const locale = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<CreationStatus>('idle');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setStatus('loading');
      setError(null);

      try {
        const response = await fetch('/api/recipes/create-from-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, sessionId, appLanguage: locale }),
        });

        if (!response.ok) {
          const errData = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(errData.error ?? `Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as CreateFromTextResponse;

        if (data.status === 'recipe_created') {
          setStatus('success');
          setRecipeId(data.recipeId ?? null);
          setSessionId(undefined);
          for (const msg of data.messages) {
            setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
          }
        } else if (data.status === 'asking_followup') {
          setStatus('asking');
          setSessionId(data.sessionId);
          for (const msg of data.messages) {
            setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
          }
        } else {
          // rejected
          setStatus('idle');
          setSessionId(undefined);
          for (const msg of data.messages) {
            setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setStatus('error');
        setError(message);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: message },
        ]);
      }
    },
    [locale, sessionId],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setStatus('idle');
    setSessionId(undefined);
    setRecipeId(null);
    setError(null);
  }, []);

  return { messages, status, recipeId, error, sendMessage, reset };
}
