'use client';

import {
  useRef,
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useRecipeCreation } from '@/lib/hooks/use-recipe-creation';
import type { Dictionary } from '@/app/[lang]/dictionaries';
import { Button, LinkButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecipeCreationChatProps {
  labels: Dictionary['recipeCreation'];
  locale: string;
}

export function RecipeCreationChat({
  labels,
  locale,
}: RecipeCreationChatProps) {
  const { messages, status, recipeId, sendMessage, reset } = useRecipeCreation(
    locale,
    {
      errorUnexpected: labels.errorUnexpected,
      errorRequestFailed: labels.errorRequestFailed,
    },
  );
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || status === 'loading') return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const isInputDisabled = status === 'loading' || status === 'success';

  return (
    <div className="flex flex-col h-full">
      {/* Message thread */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <p className="text-brown-light text-sm text-center py-8">
            {labels.placeholder}
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap',
              msg.role === 'user'
                ? 'ml-auto bg-charcoal text-parchment rounded-br-none'
                : 'mr-auto bg-white border border-border text-brown rounded-bl-none',
            )}
          >
            {msg.content}
          </div>
        ))}
        {status === 'loading' && (
          <div
            className="mr-auto bg-white border border-border rounded-2xl rounded-bl-none px-4 py-3"
            aria-label={labels.loadingLabel}
            aria-live="polite"
          >
            <span className="inline-flex gap-1">
              <span className="w-2 h-2 rounded-full bg-brown-light animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-brown-light animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-brown-light animate-bounce [animation-delay:300ms]" />
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Success state */}
      {status === 'success' && recipeId && (
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border">
          <LinkButton
            href={`/${locale}/recipes/${recipeId}`}
            className="flex-1"
          >
            {labels.viewRecipe}
          </LinkButton>
          <Button variant="outline" onClick={reset} className="flex-1">
            {labels.createAnother}
          </Button>
        </div>
      )}

      {/* Input form */}
      {status !== 'success' && (
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 pt-2 border-t border-border"
        >
          <textarea
            ref={textareaRef}
            rows={3}
            className={cn(
              'flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring',
              'focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50',
            )}
            placeholder={labels.inputPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isInputDisabled}
            aria-label={labels.inputAriaLabel}
          />
          <Button
            type="submit"
            disabled={isInputDisabled || !input.trim()}
            className="self-end"
          >
            {status === 'loading' ? labels.sending : labels.send}
          </Button>
        </form>
      )}
    </div>
  );
}
