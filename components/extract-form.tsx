'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDictionary } from '@/lib/i18n/dictionary-context';

interface ExtractFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function ExtractForm({ onSubmit, isLoading }: ExtractFormProps) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const dict = useDictionary();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = url.trim();

    if (!trimmed) {
      setValidationError(dict.extractForm.emptyUrl);
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setValidationError(dict.extractForm.invalidUrl);
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
          placeholder={dict.extractForm.placeholder}
          disabled={isLoading}
          className="w-full"
          aria-label={dict.extractForm.ariaLabel}
        />
        {validationError && (
          <p className="text-error text-sm mt-1">{validationError}</p>
        )}
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? dict.extractForm.extracting : dict.extractForm.submit}
      </Button>
    </form>
  );
}
