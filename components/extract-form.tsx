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
