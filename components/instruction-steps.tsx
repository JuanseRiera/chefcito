interface InstructionStep {
  id: string;
  stepNumber: number;
  instruction: string;
}

interface InstructionStepsProps {
  steps: InstructionStep[];
}

export function InstructionSteps({ steps }: InstructionStepsProps) {
  return (
    <ol className="space-y-6">
      {steps.map((step) => (
        <li key={step.id} className="flex gap-4">
          {/* Step number circle */}
          <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gold/10 text-gold font-semibold text-sm">
            {step.stepNumber}
          </span>
          {/* Step text */}
          <p className="text-brown pt-1 leading-relaxed">
            {step.instruction}
          </p>
        </li>
      ))}
    </ol>
  );
}
