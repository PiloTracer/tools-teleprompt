import { describe, expect, it, vi } from "vitest";

import {
  buildRecognitionLangCandidates,
  detectScriptLanguage,
  formatRecognitionLanguageLabel,
  inferLanguageFromScriptText,
} from "../../src/prompter/adaptive/detectScriptLanguage";
import type { ParsedScriptLine } from "../../src/prompter/adaptive/parseScriptLines";

describe("formatRecognitionLanguageLabel", () => {
  it("returns a language code for empty input (never AUTO)", () => {
    expect(formatRecognitionLanguageLabel("")).toMatch(/^[A-Z]{2}$/);
  });

  it("returns uppercase base tag", () => {
    expect(formatRecognitionLanguageLabel("es-ES")).toBe("ES");
    expect(formatRecognitionLanguageLabel("en-US")).toBe("EN");
  });
});

describe("inferLanguageFromScriptText", () => {
  it("detects Spanish from accented characters", () => {
    expect(
      inferLanguageFromScriptText(
        "Presentación sobre facturación electrónica integrada con hacienda en España",
      ),
    ).toBe("es");
  });
});

describe("detectScriptLanguage", () => {
  it("prefers script content over html lang", () => {
    const parsed: ParsedScriptLine[] = [
      {
        index: 0,
        text: "Presentación del editor argentino de IBM y el framework Agent OS para construir software con agentes alineados",
        kind: "spoken",
      },
    ];

    vi.spyOn(document.documentElement, "lang", "get").mockReturnValue("en");
    expect(detectScriptLanguage(parsed)).toBe("es");
  });
});

describe("buildRecognitionLangCandidates", () => {
  it("returns regional variants for Spanish", () => {
    expect(buildRecognitionLangCandidates("es")).toEqual(["es-ES", "es"]);
  });
});
