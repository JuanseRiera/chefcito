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
