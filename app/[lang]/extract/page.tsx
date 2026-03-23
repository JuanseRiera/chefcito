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
import { useDictionary } from '@/lib/i18n/dictionary-context';

export default function ExtractPage() {
  const dict = useDictionary();
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
        {dict.extract.title}
      </h1>
      <p className="text-brown-light mb-8">{dict.extract.subtitle}</p>

      {status !== 'success' && (
        <ExtractForm onSubmit={extract} isLoading={status === 'extracting'} />
      )}

      {status === 'error' && error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>{dict.extract.failed}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={reset}
          >
            {dict.extract.tryAgain}
          </Button>
        </Alert>
      )}

      {status === 'extracting' && (
        <ExtractionProgress
          completedStages={completedStages}
          currentStage={currentStage}
        />
      )}

      {status === 'success' && result && (
        <ExtractionResult recipe={result} onExtractAnother={reset} />
      )}
    </div>
  );
}
