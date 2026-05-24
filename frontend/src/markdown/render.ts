import MarkdownIt from "markdown-it";

import { renderPlain } from "./plain";
import { sanitizeHtml } from "./sanitize";
import { asSafeHtml, type SafeHtml, type ScriptFormat } from "./types";

const markdownParser = new MarkdownIt({ html: false, linkify: true });

markdownParser.renderer.rules.blockquote_open = () => '<blockquote class="tp-meta">\n';

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
