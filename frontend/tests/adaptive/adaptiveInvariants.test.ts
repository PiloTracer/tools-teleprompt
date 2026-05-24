import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { classifyScriptLine } from "../../src/prompter/adaptive/parseScriptLines";

const adaptiveSrcDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../src/prompter/adaptive",
);

/** Binding markup table — adaptive-teleprompter SPEC §4. */
const MARKUP_TABLE: Array<{ example: string; kind: "spoken" | "meta" }> = [
  { example: "[DATACARD]", kind: "meta" },
  { example: "[CARD: title]", kind: "meta" },
  { example: "(beat)", kind: "meta" },
  { example: "(stage direction)", kind: "meta" },
  { example: "/* note */", kind: "meta" },
  { example: "> direction", kind: "meta" },
  { example: "Hello world", kind: "spoken" },
  { example: "She said hello.", kind: "spoken" },
  { example: "Hello /* note */", kind: "spoken" },
];

describe("adaptive invariants (I1 — device-local audio)", () => {
  const forbiddenPatterns = [
    /\bfetch\s*\(/,
    /XMLHttpRequest/,
    /sendBeacon/,
    /WebSocket/,
    /navigator\.sendBeacon/,
  ];

  it("adaptive module source does not exfiltrate audio or script", () => {
    const files = readdirSync(adaptiveSrcDir).filter((name) => name.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = readFileSync(join(adaptiveSrcDir, file), "utf8");
      for (const pattern of forbiddenPatterns) {
        expect(content, `${file} must not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

describe("markup syntax table (R11–R12)", () => {
  it("classifies every binding row in the SPEC table", () => {
    for (const row of MARKUP_TABLE) {
      expect(classifyScriptLine(row.example), row.example).toBe(row.kind);
    }
  });
});

describe("adaptive gate references (I2)", () => {
  it("documents getUserMedia gate in useVoiceActivity", () => {
    const vadSource = readFileSync(join(adaptiveSrcDir, "useVoiceActivity.ts"), "utf8");
    expect(vadSource).toMatch(/enabled:\s*boolean/);
    expect(vadSource).toMatch(/getUserMedia/);
    expect(vadSource).toMatch(/when false, zero getUserMedia/i);
  });
});
