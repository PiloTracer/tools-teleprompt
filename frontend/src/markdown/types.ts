export type ScriptFormat = "plain" | "markdown";

/** Sanitized or pipeline-stage HTML safe for binding after full pipeline (see render + sanitize). */
export type SafeHtml = string & { readonly __safeHtmlBrand?: unique symbol };

export function asSafeHtml(html: string): SafeHtml {
  return html as SafeHtml;
}
