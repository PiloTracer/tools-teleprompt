import type { ReactNode } from "react";

export type HandoffReceiveSectionProps = {
  titleId: string;
  title: string;
  testId?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function HandoffReceiveSection({
  titleId,
  title,
  testId,
  children,
  footer,
}: HandoffReceiveSectionProps) {
  return (
    <section
      className="tp-handoff-receive"
      aria-labelledby={titleId}
      data-testid={testId}
    >
      <h1 id={titleId} className="tp-handoff-receive__title">
        {title}
      </h1>
      {children}
      {footer}
    </section>
  );
}

export type HandoffReceiveCardProps = {
  children: ReactNode;
  testId?: string;
  className?: string;
};

export function HandoffReceiveCard({
  children,
  testId,
  className,
}: HandoffReceiveCardProps) {
  const classes = ["ds-card", className].filter(Boolean).join(" ");

  return (
    <div className={classes} data-testid={testId}>
      {children}
    </div>
  );
}

export function HandoffReceiveLoading({
  message,
  testId,
}: {
  message: string;
  testId?: string;
}) {
  return (
    <p className="tp-handoff-meta" aria-busy="true" data-testid={testId}>
      {message}
    </p>
  );
}

export function HandoffReceiveError({ message }: { message: string }) {
  return (
    <p className="ds-alert" data-variant="error" role="alert">
      {message}
    </p>
  );
}
