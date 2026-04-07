'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Dictionary } from '@/app/[lang]/dictionaries';

interface ExtractFormProps {
  labels: Dictionary['extractForm'];
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function ExtractForm({ labels, onSubmit, isLoading }: ExtractFormProps) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = url.trim();

    if (!trimmed) {
      setValidationError(labels.emptyUrl);
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setValidationError(labels.invalidUrl);
      return;
    }

    setValidationError(null);
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-input bg-white/80 p-3 shadow-sm">
        <Input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (validationError) setValidationError(null);
          }}
          placeholder={labels.placeholder}
          disabled={isLoading}
          className="h-10 w-full border-0 bg-transparent px-1 shadow-none focus-visible:border-0 focus-visible:ring-0"
          aria-label={labels.ariaLabel}
        />

        {validationError && (
          <p className="mt-1 text-sm text-error">{validationError}</p>
        )}

        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-brown-light">{labels.hint}</p>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto"
            size="lg"
          >
            {isLoading ? labels.extracting : labels.submit}
          </Button>
        </div>
      </div>
    </form>
  );
}
