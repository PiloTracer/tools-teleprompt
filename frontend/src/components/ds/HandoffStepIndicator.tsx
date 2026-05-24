export type HandoffStepIndicatorProps = {
  index: number;
  total: number;
  label?: string;
};

export function HandoffStepIndicator({ index, total, label }: HandoffStepIndicatorProps) {
  return (
    <p
      className="ds-handoff-step"
      data-testid="handoff-step-indicator"
      aria-live="polite"
      aria-atomic="true"
    >
      {label ?? `Scan code ${index} of ${total}`}
    </p>
  );
}
