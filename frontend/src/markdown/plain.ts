import { asSafeHtml, type SafeHtml } from "./types";

export function escapePlainText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain-text path: escape all characters; no markdown parse (SPEC R2). */
export function renderPlain(source: string): SafeHtml {
  const escaped = escapePlainText(source);
  return asSafeHtml(`<pre class="tp-plain">${escaped}</pre>`);
}
