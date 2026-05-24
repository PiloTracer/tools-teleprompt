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
    <section className="tp-preview-panel ds-card" aria-labelledby="tp-preview-title">
      <h2 id="tp-preview-title">{en.preview.title}</h2>
      <div className="tp-format-control ds-segmented" role="radiogroup" aria-label="Script format">
        <div className="ds-segmented__track">
          <label className="ds-segmented__option">
            <input
              type="radio"
              name="script-format"
              value="plain"
              checked={format === "plain"}
              onChange={() => onFormatChange("plain")}
            />
            <span className="ds-segmented__label">{en.preview.formatPlain}</span>
          </label>
          <label className="ds-segmented__option">
            <input
              type="radio"
              name="script-format"
              value="markdown"
              checked={format === "markdown"}
              onChange={() => onFormatChange("markdown")}
            />
            <span className="ds-segmented__label">{en.preview.formatMarkdown}</span>
          </label>
        </div>
      </div>
      <SanitizedHtml html={html} className="tp-preview" />
    </section>
  );
}
