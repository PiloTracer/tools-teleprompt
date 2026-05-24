import type { ReactNode } from "react";

import { CopyButton } from "./CopyButton";

export type HandoffResultCardProps = {
  variant: "qr" | "lan" | "relay";
  children: ReactNode;
  url?: string;
  urlLabel?: string;
  testId?: string;
};

function truncateUrl(url: string, max = 48): string {
  if (url.length <= max) {
    return url;
  }
  const head = Math.floor(max * 0.55);
  const tail = max - head - 1;
  return `${url.slice(0, head)}…${url.slice(-tail)}`;
}

export function HandoffResultCard({
  variant,
  children,
  url,
  urlLabel,
  testId,
}: HandoffResultCardProps) {
  return (
    <div
      className="ds-handoff-result ds-card"
      data-variant={variant}
      data-testid={testId}
    >
      {children}
      {url ? (
        <div className="ds-handoff-result__link">
          {urlLabel ? <span className="ds-handoff-result__link-label">{urlLabel}</span> : null}
          <p className="ds-handoff-result__url" title={url}>
            <a href={url}>{truncateUrl(url)}</a>
          </p>
          <CopyButton text={url} />
        </div>
      ) : null}
    </div>
  );
}
