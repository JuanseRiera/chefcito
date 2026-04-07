'use client';

import type { PipelineStage } from '@/lib/types/sse';
import type { Dictionary } from '@/app/[lang]/dictionaries';

interface CompletedStage {
  stage: PipelineStage;
  message: string;
}

interface ExtractionProgressProps {
  labels: Dictionary['extractionProgress'];
  completedStages: CompletedStage[];
  currentStage: { stage: PipelineStage; message: string } | null;
}

export function ExtractionProgress({
  labels,
  completedStages,
  currentStage,
}: ExtractionProgressProps) {
  const stageLabels: Record<PipelineStage, string> = {
    fetching: labels.fetching,
    extracting: labels.extracting,
    curating: labels.curating,
    retrying: labels.retrying,
    persisting: labels.persisting,
    uploading_image: labels.uploading_image,
  };

  return (
    <div className="space-y-3">
      {/* Completed stages */}
      {completedStages.map((stage, i) => (
        <div key={i} className="flex items-center gap-3">
          {/* Checkmark icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-success shrink-0"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-brown-light">
            {stageLabels[stage.stage] ?? stage.message}
          </span>
        </div>
      ))}

      {/* Current (active) stage */}
      {currentStage && (
        <div className="flex items-center gap-3">
          {/* Spinning indicator */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gold animate-spin shrink-0"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-brown font-medium">
            {stageLabels[currentStage.stage] ?? currentStage.message}
          </span>
        </div>
      )}
    </div>
  );
}
