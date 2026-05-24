import DOMPurify from "dompurify";

import { asSafeHtml, type SafeHtml } from "./types";

export { isMetaSourceLine } from "../prompter/adaptive/parseScriptLines";

const ALLOWED_TAGS = [
  "p",
  "br",
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

/** Sanitize intermediate HTML per SPEC R5–R6; enforce link attrs per R4. */
export function sanitizeHtml(dirty: string): SafeHtml {
  registerLinkHooks();
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: ["href", "class", "rel", "target"],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [...FORBID_TAGS],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
  });
  return asSafeHtml(clean);
}
