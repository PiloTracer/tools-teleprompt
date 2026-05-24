import { describe, expect, it } from "vitest";

import {
  classifyScriptLine,
  isMetaSourceLine,
  parseScriptLines,
} from "../../src/prompter/adaptive/parseScriptLines";

describe("classifyScriptLine", () => {
  it("classifies bracket tags as meta", () => {
    expect(classifyScriptLine("[DATACARD]")).toBe("meta");
    expect(classifyScriptLine("[CARD: title]")).toBe("meta");
    expect(classifyScriptLine("  [DATACARD]  ")).toBe("meta");
  });

  it("classifies whole-line parenthetical directions as meta", () => {
    expect(classifyScriptLine("(beat)")).toBe("meta");
    expect(classifyScriptLine("(stage direction)")).toBe("meta");
  });

  it("classifies whole-line block comments as meta", () => {
    expect(classifyScriptLine("/* note */")).toBe("meta");
  });

  it("classifies markdown blockquotes as meta", () => {
    expect(classifyScriptLine("> direction")).toBe("meta");
    expect(classifyScriptLine("  > whisper stage note")).toBe("meta");
  });

  it("classifies plain dialogue as spoken", () => {
    expect(classifyScriptLine("Hello world")).toBe("spoken");
    expect(classifyScriptLine("She said hello.")).toBe("spoken");
  });

  it("treats trailing block comment on a line as spoken (v1)", () => {
    expect(classifyScriptLine("Hello /* note */")).toBe("spoken");
  });

  it("treats empty lines as spoken", () => {
    expect(classifyScriptLine("")).toBe("spoken");
    expect(classifyScriptLine("   ")).toBe("spoken");
  });

  it("classifies whole-line parens as meta including spoken-looking text (v1)", () => {
    expect(classifyScriptLine("(Hello?)")).toBe("meta");
  });
});

describe("isMetaSourceLine", () => {
  it("matches classifyScriptLine meta results", () => {
    expect(isMetaSourceLine("[DATACARD]")).toBe(true);
    expect(isMetaSourceLine("Hello")).toBe(false);
    expect(isMetaSourceLine("> cue")).toBe(true);
  });
});

describe("parseScriptLines", () => {
  it("returns empty array for empty source", () => {
    expect(parseScriptLines("")).toEqual([]);
  });

  it("segments on newlines and preserves index order", () => {
    const source = "Line one\n[DATACARD]\n> direction\n(spoken line)";
    const lines = parseScriptLines(source);
    expect(lines).toHaveLength(4);
    expect(lines[0]).toMatchObject({ index: 0, text: "Line one", kind: "spoken" });
    expect(lines[1]).toMatchObject({ index: 1, text: "[DATACARD]", kind: "meta" });
    expect(lines[2]).toMatchObject({ index: 2, text: "> direction", kind: "meta" });
    expect(lines[3]).toMatchObject({ index: 3, text: "(spoken line)", kind: "meta" });
  });

  it("handles single line without trailing newline", () => {
    expect(parseScriptLines("Only line")).toEqual([
      { index: 0, text: "Only line", kind: "spoken" },
    ]);
  });
});
