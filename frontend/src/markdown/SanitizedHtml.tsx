import type { SafeHtml } from "./types";

type SanitizedHtmlProps = {
  html: SafeHtml;
  className?: string;
};

/**
 * Sole approved DOM insertion path for pipeline HTML (SPEC R7).
 * Accepts only SafeHtml from renderScript / sanitizeHtml — never raw user strings.
 */
export function SanitizedHtml({ html, className }: SanitizedHtmlProps) {
  if (!html) {
    return null;
  }

  return (
    <div
      className={className}
      data-testid="sanitized-html"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
