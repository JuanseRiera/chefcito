'use client';

import { useRecipeExtraction } from '@/lib/hooks/use-recipe-extraction';
import { ExtractForm } from '@/components/extract-form';
import { ExtractionProgress } from '@/components/extraction-progress';
import { ExtractionResult } from '@/components/extraction-result';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { Dictionary } from '@/app/[lang]/dictionaries';

interface ExtractPageClientProps {
  extractLabels: Dictionary['extract'];
  extractFormLabels: Dictionary['extractForm'];
  extractionProgressLabels: Dictionary['extractionProgress'];
  extractionResultLabels: Dictionary['extractionResult'];
  lang: string;
}

export function ExtractPageClient({
  extractLabels,
  extractFormLabels,
  extractionProgressLabels,
  extractionResultLabels,
  lang,
}: ExtractPageClientProps) {
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="font-serif text-3xl text-charcoal mb-2">
        {extractLabels.title}
      </h1>
      <p className="text-brown-light max-w-2xl">{extractLabels.subtitle}</p>

      {status !== 'success' && (
        <>
          <ExtractForm
            labels={extractFormLabels}
            onSubmit={extract}
            isLoading={status === 'extracting'}
          />

          {status === 'error' && error && (
            <Alert variant="destructive">
              <AlertTitle>{extractLabels.failed}</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={reset}
              >
                {extractLabels.tryAgain}
              </Button>
            </Alert>
          )}

          {status === 'extracting' && (
            <div className="rounded-2xl bg-parchment/40 px-4 py-4">
              <ExtractionProgress
                labels={extractionProgressLabels}
                completedStages={completedStages}
                currentStage={currentStage}
              />
            </div>
          )}
        </>
      )}

      {status === 'success' && result && (
        <ExtractionResult
          labels={extractionResultLabels}
          recipe={result}
          locale={lang}
          onExtractAnother={reset}
        />
      )}
    </div>
  );
}
