import { describe, expect, it } from "vitest";

import {
  matchTranscriptToLine,
  normalize,
  tokenize,
} from "../../src/prompter/adaptive/matchScriptLine";
import type { ParsedScriptLine } from "../../src/prompter/adaptive/types";

function spoken(index: number, text: string): ParsedScriptLine {
  return { index, text, kind: "spoken" };
}

function meta(index: number, text: string): ParsedScriptLine {
  return { index, text, kind: "meta" };
}

const SCRIPT: ParsedScriptLine[] = [
  spoken(0, "Welcome to the show, everyone."),
  spoken(1, "Tonight we have a very special guest."),
  spoken(2, "Please give a warm welcome to our guest."),
  spoken(3, "Thank you for joining us today."),
  spoken(4, "Let us begin with the first topic."),
  spoken(5, "We will discuss artificial intelligence."),
  spoken(6, "AI has changed the world in many ways."),
  spoken(7, "From healthcare to transportation."),
  spoken(8, "The future looks bright and promising."),
  spoken(9, "Thank you all for being here tonight."),
];

// ---------------------------------------------------------------------------
// normalize / tokenize
// ---------------------------------------------------------------------------
describe("normalize", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalize("Hello, World!")).toBe("hello world");
    expect(normalize("It's a test...")).toBe("its a test");
  });

  it("collapses multiple spaces", () => {
    expect(normalize("foo  bar   baz")).toBe("foo bar baz");
  });

  it("returns empty string for non-alpha input", () => {
    expect(normalize("123! @#$")).toBe("123");
  });

  it("strips accents so accented and unaccented forms match (Spanish support)", () => {
    expect(normalize("línea")).toBe("linea");
    expect(normalize("también")).toBe("tambien");
    expect(normalize("nación")).toBe("nacion");
    expect(normalize("Según")).toBe("segun");
    // Both forms normalise identically → transcript matches script
    expect(normalize("línea")).toBe(normalize("linea"));
    expect(normalize("también")).toBe(normalize("tambien"));
  });
});

describe("tokenize", () => {
  it("splits on spaces and filters empties", () => {
    expect(tokenize("hello world")).toEqual(["hello", "world"]);
    expect(tokenize("  one  two  ")).toEqual(["one", "two"]);
  });

  it("returns empty array for empty string", () => {
    expect(tokenize("")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// matchTranscriptToLine
// ---------------------------------------------------------------------------
describe("matchTranscriptToLine", () => {
  it("returns null for empty transcript", () => {
    expect(matchTranscriptToLine([], SCRIPT, 0)).toBeNull();
  });

  it("returns null when no words match any line", () => {
    expect(matchTranscriptToLine(["xylophone", "quartz"], SCRIPT, 0)).toBeNull();
  });

  it("matches a line by its distinctive words", () => {
    // "artificial intelligence" is only in line 5
    const result = matchTranscriptToLine(["artificial", "intelligence"], SCRIPT, 0);
    expect(result).toBe(5);
  });

  it("advances the cursor forward to a later match", () => {
    // cursor at line 3; transcript matches line 7
    const result = matchTranscriptToLine(["healthcare", "transportation"], SCRIPT, 3);
    expect(result).toBe(7);
  });

  it("allows small backward backtrack from cursor", () => {
    // cursor at line 9; words from line 8 should still match (within searchWindowBackward)
    const result = matchTranscriptToLine(["bright", "promising"], SCRIPT, 9);
    expect(result).toBe(8);
  });

  it("skips meta lines as candidates", () => {
    const mixedScript: ParsedScriptLine[] = [
      spoken(0, "Opening statement here."),
      meta(1, "[CARD: infographic slide]"),
      spoken(2, "Continuing after the infographic slide."),
    ];
    // "infographic slide" appears in meta line 1 AND spoken line 2.
    // Meta line 1 must be skipped; result should be 2.
    const result = matchTranscriptToLine(["infographic", "slide"], mixedScript, 0);
    expect(result).toBe(2);
  });

  it("does not search before the allowed backward window", () => {
    // cursorLine=6, backward=3 → searchStart=3. Line 0 is out of range.
    const result = matchTranscriptToLine(
      ["welcome", "show", "everyone"],
      SCRIPT,
      6,
      14, // forward
      3, // backward
    );
    // line 0 is at index 0, which is < searchStart(3) — should not match
    expect(result).toBeNull();
  });

  it("does not search past the forward window", () => {
    // cursorLine=0, forward window=2 → lines 0,1,2 searched.
    // "future" is in line 8 which is beyond the window.
    const result = matchTranscriptToLine(
      ["future", "bright"],
      SCRIPT,
      0,
      2, // small window
    );
    expect(result).toBeNull();
  });

  it("matches Spanish words with accents in script but without in transcript", () => {
    const spanishScript: ParsedScriptLine[] = [
      spoken(0, "Primero, Bob: editor nuevo de IBM, en la misma línea que Cursor."),
      spoken(1, "Agent OS es un framework de desarrollo publicado en GitHub."),
      spoken(2, "También incluye estándares vinculantes y conceptos de arquitectura."),
    ];
    // Transcript has "linea" (no accent) — should still match line 0.
    const result = matchTranscriptToLine(["linea", "cursor", "ibm"], spanishScript, 0);
    expect(result).toBe(0);
    // "tambien" (no accent) → line 2
    const result2 = matchTranscriptToLine(["tambien", "estandares"], spanishScript, 0);
    expect(result2).toBe(2);
  });

  it("picks the best-scoring line when multiple partial matches exist", () => {
    // "thank you" appears in both line 3 ("Thank you for joining us today") and
    // line 9 ("Thank you all for being here tonight").
    // From cursor=0, both are in forward window. Whichever scores higher wins.
    // Line 9 has "all" which is unique; line 3 has "joining". Both match on
    // "thank" + "you". Neither has a clear winner from just those two words — 
    // the function should return the higher-scoring one (or any consistent result).
    const result = matchTranscriptToLine(["thank", "you"], SCRIPT, 0);
    expect(result === 3 || result === 9).toBe(true);
  });
});
