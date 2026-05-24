import { asSafeHtml, type SafeHtml } from "./types";

export function escapePlainText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Plain-text path: escape all characters; no markdown parse (SPEC R2).
 *
 * Each source line is wrapped in `<span data-line-index="N">` so the adaptive
 * teleprompter can measure ACTUAL rendered Y positions per line (via
 * `getBoundingClientRect`) instead of guessing from a fixed line-height.
 * Wrapping with a span (not a block element) preserves the existing
 * `<pre>`-based plain-text layout and selection behaviour.
 */
export function renderPlain(source: string): SafeHtml {
  if (source.length === 0) {
    return asSafeHtml("");
  }
  const inner = source
    .split("\n")
    .map((line, i) => `<span data-line-index="${i}">${escapePlainText(line)}</span>`)
    .join("\n");
  return asSafeHtml(`<pre class="tp-plain">${inner}</pre>`);
}
