import DOMPurify from "dompurify";

import { asSafeHtml, type SafeHtml } from "./types";

export { isMetaSourceLine } from "../prompter/adaptive/parseScriptLines";

const ALLOWED_TAGS = [
  "p",
  "br",
  "span",
  "strong",
  "em",
  "u",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "pre",
  "blockquote",
  "hr",
] as const;

const FORBID_TAGS = ["script", "iframe", "object", "embed"] as const;

let hooksRegistered = false;

function registerLinkHooks(): void {
  if (hooksRegistered || typeof window === "undefined") {
    return;
  }
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("rel", "noopener noreferrer");
      node.setAttribute("target", "_blank");
    }
  });
  hooksRegistered = true;
}

/**
 * Sanitize intermediate HTML per SPEC R5–R6; enforce link attrs per R4.
 *
 * `data-*` attributes are allowed because the markdown render pipeline
 * (`render.ts`) tags every block element with `data-line-start` /
 * `data-line-end` (0-based, inclusive) so the adaptive teleprompter can
 * measure ACTUAL DOM line positions.  `data-*` attributes are inert and
 * cannot execute code, so allowing them does not weaken the XSS posture
 * enforced by the rest of this allow-list.
 */
export function sanitizeHtml(dirty: string): SafeHtml {
  registerLinkHooks();
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: ["href", "class", "rel", "target"],
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: [...FORBID_TAGS],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
  });
  return asSafeHtml(clean);
}
