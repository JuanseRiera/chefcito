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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RecipeCreationChatProps {
  labels: Dictionary['recipeCreation'];
  locale: string;
}

export function RecipeCreationChat({
  labels,
  locale,
}: RecipeCreationChatProps) {
  const { messages, status, recipeId, error, sendMessage, reset } =
    useRecipeCreation(locale, {
      errorUnexpected: labels.errorUnexpected,
      errorRequestFailed: labels.errorRequestFailed,
    });
  const [input, setInput] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep scroll ownership inside the chat thread, not the page.
  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;

    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
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

  const handleExampleClick = (example: string) => {
    setInput(example);
    textareaRef.current?.focus();
  };

  const isInputDisabled = status === 'loading' || status === 'success';

  return (
    <div className="flex flex-col rounded-[1.75rem] border border-border bg-card shadow-sm">
      <div ref={threadRef} className="space-y-4 px-4 py-4 sm:px-5 overflow-y-auto">
        {messages.length === 0 && (
          <div className="space-y-3 rounded-2xl border border-dashed border-border bg-parchment/70 p-4 sm:p-5">
            <p className="text-sm leading-6 text-brown-light">
              {labels.placeholder}
            </p>
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-brown-light">
                {labels.examplesTitle}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {labels.examples.map((example) => (
                  <button
                    key={example.title}
                    type="button"
                    onClick={() => handleExampleClick(example.prompt)}
                    className="cursor-pointer rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <Card className="h-full border border-border bg-white py-3 transition-colors hover:border-burgundy hover:bg-parchment/50 hover:shadow-md">
                      <CardHeader className="gap-2 pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="font-serif text-lg text-charcoal">
                            {example.title}
                          </CardTitle>
                          <span className="rounded-full border border-border px-2 py-1 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-brown-light">
                            {labels.useExample}
                          </span>
                        </div>
                        <p className="text-sm text-brown-light">
                          {example.summary}
                        </p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <pre className="overflow-hidden whitespace-pre-wrap font-sans text-sm leading-5 text-brown-light line-clamp-4">
                          {example.preview}
                        </pre>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'max-w-[90%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm',
              msg.role === 'user'
                ? 'ml-auto rounded-br-md bg-burgundy text-parchment'
                : 'mr-auto rounded-bl-md border border-border bg-white text-brown',
            )}
          >
            {msg.content}
          </div>
        ))}

        {status === 'loading' && (
          <div
            className="mr-auto rounded-2xl rounded-bl-md border border-border bg-white px-4 py-3 shadow-sm"
            aria-label={labels.loadingLabel}
            aria-live="polite"
          >
            <span className="inline-flex gap-1">
              <span className="h-2 w-2 rounded-full bg-brown-light animate-bounce [animation-delay:0ms]" />
              <span className="h-2 w-2 rounded-full bg-brown-light animate-bounce [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-brown-light animate-bounce [animation-delay:300ms]" />
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-parchment/35 px-4 py-4 sm:px-5">
        {status === 'success' && recipeId ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton
              href={`/${locale}/recipes/${recipeId}`}
              className="flex-1"
              size="lg"
            >
              {labels.viewRecipe}
            </LinkButton>
            <Button
              variant="outline"
              onClick={reset}
              className="flex-1"
              size="lg"
            >
              {labels.createAnother}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {status === 'error' && (
              <Alert variant="destructive">
                <AlertTitle>{labels.errorTitle}</AlertTitle>
                <AlertDescription>
                  {error ?? labels.errorUnexpected}
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-2xl border border-input bg-white/80 p-3 shadow-sm">
              <textarea
                ref={textareaRef}
                rows={4}
                className={cn(
                  'min-h-28 max-h-56 w-full resize-y bg-transparent px-1 py-1 text-sm text-brown',
                  'placeholder:text-muted-foreground focus-visible:outline-none disabled:opacity-50',
                )}
                placeholder={labels.inputPlaceholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isInputDisabled}
                aria-label={labels.inputAriaLabel}
              />
              <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-brown-light">
                  {labels.composerHint}
                </p>
                <Button
                  type="submit"
                  disabled={isInputDisabled || !input.trim()}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {status === 'loading' ? labels.sending : labels.send}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
