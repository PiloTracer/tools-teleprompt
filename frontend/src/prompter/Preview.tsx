import { useMemo } from "react";

import { en } from "../lib/i18n/en";
import { renderScript } from "../markdown/render";
import { SanitizedHtml } from "../markdown/SanitizedHtml";
import type { ScriptFormat } from "../markdown/types";

type PreviewProps = {
  source: string;
  format: ScriptFormat;
  onFormatChange: (format: ScriptFormat) => void;
};

export function Preview({ source, format, onFormatChange }: PreviewProps) {
  const html = useMemo(() => renderScript(source, format), [source, format]);

  return (
    <section className="tp-preview-panel" aria-labelledby="tp-preview-title">
      <h2 id="tp-preview-title">{en.preview.title}</h2>
      <fieldset className="tp-format-fieldset">
        <legend className="tp-sr-only">Script format</legend>
        <label>
          <input
            type="radio"
            name="script-format"
            value="plain"
            checked={format === "plain"}
            onChange={() => onFormatChange("plain")}
          />
          {en.preview.formatPlain}
        </label>
        <label>
          <input
            type="radio"
            name="script-format"
            value="markdown"
            checked={format === "markdown"}
            onChange={() => onFormatChange("markdown")}
          />
          {en.preview.formatMarkdown}
        </label>
      </fieldset>
      <SanitizedHtml html={html} className="tp-preview" />
    </section>
  );
}
