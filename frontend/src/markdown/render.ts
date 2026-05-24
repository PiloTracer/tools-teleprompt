import MarkdownIt from "markdown-it";

import { renderPlain } from "./plain";
import { sanitizeHtml } from "./sanitize";
import { asSafeHtml, type SafeHtml, type ScriptFormat } from "./types";

const markdownParser = new MarkdownIt({ html: false, linkify: true });

markdownParser.renderer.rules.blockquote_open = (tokens, idx, options, _env, self) => {
  const token = tokens[idx];
  token.attrJoin("class", "tp-meta");
  return self.renderToken(tokens, idx, options) + "\n";
};

/**
 * Tag every opening block token with `data-line-start` / `data-line-end`
 * (0-based, inclusive) from markdown-it's source `token.map`.  The adaptive
 * teleprompter's `useAdaptiveScroll` reads these attributes from the rendered
 * DOM to measure ACTUAL line positions (accounting for wrap, margins, and
 * padding) instead of using a simplified `i * lineHeight` model that does
 * not match what the browser actually renders.
 *
 * Data attributes are inert (they cannot trigger code) so DOMPurify is
 * configured to allow them through; see `sanitize.ts`.
 */
markdownParser.core.ruler.push("tp_line_attrs", (state) => {
  for (const token of state.tokens) {
    if (token.map && token.nesting === 1) {
      const [startLine, endLineExclusive] = token.map;
      token.attrSet("data-line-start", String(startLine));
      token.attrSet("data-line-end", String(Math.max(startLine, endLineExclusive - 1)));
    }
  }
});

export function renderScript(source: string, format: ScriptFormat): SafeHtml {
  if (!source) {
    return asSafeHtml("");
  }

  if (format === "plain") {
    return renderPlain(source);
  }

  try {
    return sanitizeHtml(markdownParser.render(source));
  } catch {
    return renderPlain(source);
  }
}
