import { forwardRef, memo } from "react";

import type { SafeHtml } from "./types";

type SanitizedHtmlProps = {
  html: SafeHtml;
  className?: string;
};

/**
 * Sole approved DOM insertion path for pipeline HTML (SPEC R7).
 * Accepts only SafeHtml from renderScript / sanitizeHtml — never raw user strings.
 *
 * Memoized so parent re-renders (e.g. speech sync ticks) do not reset innerHTML
 * and wipe imperative word-span annotations on the script body.
 */
export const SanitizedHtml = memo(
  forwardRef<HTMLDivElement, SanitizedHtmlProps>(function SanitizedHtml(
    { html, className },
    ref,
  ) {
    if (!html) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={className}
        data-testid="sanitized-html"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }),
);
