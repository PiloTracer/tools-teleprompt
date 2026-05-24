import { describe, expect, it } from "vitest";

import {
  advanceFromCursor,
  advanceRepeatedlyFromCursor,
  findInitialLock,
  isSkippableScriptToken,
  matchRejectReason,
  matchTranscriptToWordIndex,
  MAX_FORWARD_WORD_JUMP,
  MIN_SKIP_AHEAD_DISTINCTIVE,
  MIN_SKIP_AHEAD_MATCH,
  shouldAcceptWordMatch,
  type WordMatchResult,
  wordsMatchLenient,
  wordsMatchStrict,
} from "../../src/prompter/adaptive/matchScriptWords";

function matchResult(partial: Partial<WordMatchResult> & Pick<WordMatchResult, "wordIndex">): WordMatchResult {
  return {
    score: 0.5,
    matchedWords: 2,
    distinctiveMatchedWords: 0,
    ...partial,
  };
}

const SCRIPT = [
  "Bienvenidos",
  "en",
  "este",
  "video",
  "mostramos",
  "como",
  "trabajamos",
  "en",
  "la",
  "practica",
  "con",
  "Bob",
  "el",
  "editor",
  "argentino",
  "de",
  "IBM",
  "y",
  "con",
  "el",
  "framework",
  "Agent",
  "OS",
  "para",
  "construir",
  "software",
  "parece",
  "que",
  "cuenta",
  "con",
  "la",
  "interfaz",
];

describe("findInitialLock", () => {
  it("locks onto the earliest consecutive run in the script opening", () => {
    const result = findInitialLock(
      ["Bienvenidos", "en", "este", "video", "mostramos"],
      SCRIPT,
    );
    expect(result?.wordIndex).toBe(4);
    expect(result?.score).toBeGreaterThan(0.5);
  });
});

describe("advanceFromCursor", () => {
  it("advances sequentially from the cursor", () => {
    const result = advanceFromCursor(
      ["como", "trabajamos", "en", "la"],
      SCRIPT,
      4,
    );
    expect(result?.wordIndex).toBeGreaterThan(4);
  });

  it("skips a script word when SR substitutes a name", () => {
    const result = advanceFromCursor(
      ["practica", "con", "vos", "el", "editor", "adjetivo", "de", "IBM"],
      SCRIPT,
      9,
    );
    expect(result?.wordIndex).toBeGreaterThan(11);
  });

  it("continues through SR typos on longer words", () => {
    const result = advanceFromCursor(
      ["el", "editor", "adjetivo", "de", "IBM", "y", "con", "el", "framework"],
      SCRIPT,
      11,
    );
    expect(result?.wordIndex).toBeGreaterThan(14);
  });

  it("does not jump to a repeated phrase far ahead", () => {
    const result = advanceFromCursor(
      ["en", "la", "practica", "con"],
      SCRIPT,
      8,
    );
    expect(result?.wordIndex).toBeLessThanOrEqual(8 + 12);
    expect(result?.wordIndex).toBeGreaterThan(8);
  });

  it("does not sprint ahead when the SR buffer still contains the opening", () => {
    const result = advanceFromCursor(
      ["Bienvenidos", "en", "este", "video", "mostramos", "como", "trabajamos"],
      SCRIPT,
      4,
    );
    expect(result?.wordIndex).toBeLessThanOrEqual(8);
    expect(result?.wordIndex).toBeGreaterThan(4);
  });

  it("catch-up aligns when cursor lags behind spoken tail", () => {
    const script = [
      ...SCRIPT.slice(0, 22),
      "en",
      "un",
      "proyecto",
      "real",
      "de",
      "facturacion",
    ];
    const result = advanceFromCursor(
      ["agent", "o", "as", "en", "un", "proyecto", "real", "de"],
      script,
      21,
    );
    expect(result?.wordIndex).toBeGreaterThan(21);
    expect(result && shouldAcceptWordMatch(result, 21)).toBe(true);
  });

  it("advances multiple words in one tick when SR dumps a phrase", () => {
    const result = advanceRepeatedlyFromCursor(
      ["como", "trabajamos", "en", "la", "practica", "con", "bob"],
      SCRIPT,
      4,
    );
    expect(result?.wordIndex).toBeGreaterThan(8);
    expect(result && shouldAcceptWordMatch(result, 4)).toBe(true);
  });

  it("continues through markdown pipe tokens in the script", () => {
    const script = [
      "github",
      "como",
      "codigo",
      "abierto",
      "son",
      "skills",
      "11",
      "skills",
      "|",
      "estandares",
      "vinculantes",
      "|",
      "conceptos",
      "de",
      "y",
      "documentacion",
      "para",
      "mantener",
    ];
    const result = advanceFromCursor(
      ["estandares", "y", "documentacion", "para", "mantener", "a", "los", "agentes"],
      script,
      9,
    );
    expect(result?.wordIndex).toBeGreaterThan(9);
    expect(result && shouldAcceptWordMatch(result, 9)).toBe(true);
  });

  it("re-acquires after skipping a metadata block to the next spoken paragraph", () => {
    const script = [
      "Agent",
      "OS",
      "(.ai",
      "framework)",
      "Open",
      "source:",
      "https",
      "github.com",
      "PiloTracer",
      "11",
      "skills",
      "|",
      "estandares",
      "vinculantes",
      "|",
      "conceptos",
      "de",
      "Mostrar",
      "tarjeta",
      "4",
      "5",
      "segundos",
      "Segundo",
      "Agent",
      "OS:",
      "framework",
      "de",
      "desarrollo",
      "que",
      "hemos",
      "creado",
      "y",
      "publicamos",
      "en",
      "github",
    ];
    const metaOnly = new Set([
      "open",
      "source",
      "mostrar",
      "tarjeta",
      "segundos",
      "pilotracer",
    ]);
    const result = advanceFromCursor(
      [
        "segundo",
        "agent",
        "oss",
        "framework",
        "de",
        "desarrollo",
        "que",
        "hemos",
        "creado",
      ],
      script,
      3,
      metaOnly,
    );
    expect(result?.wordIndex).toBeGreaterThan(20);
    expect(result?.matchedWords).toBeGreaterThanOrEqual(MIN_SKIP_AHEAD_MATCH);
    expect(result?.distinctiveMatchedWords).toBeGreaterThanOrEqual(MIN_SKIP_AHEAD_DISTINCTIVE);
    expect(result && shouldAcceptWordMatch(result, 3)).toBe(true);
  });

  it("does not jump to bracket tags on coincidental function-word matches", () => {
    const script = [
      "Es",
      "un",
      "trabajo",
      "en",
      "progreso:",
      "en",
      "este",
      "video",
      "no",
      "mostramos",
      "el",
      "producto",
      "terminado,",
      "El",
      "proyecto",
      "con",
      "memoria",
      "en",
      ".work/",
      "para",
      "que",
      "los",
      "agentes",
      "retomen",
      "contexto",
      "sin",
      "repetir",
      "todo",
      "cada",
      "vez.",
      "[SECCIÓN",
      "2:",
      "INICIANDO",
      "LA",
      "SESIÓN]",
      "[CORE]",
      "[Captura",
      "de",
      "Bob",
      "abriéndose]",
      "Para",
      "empezar",
      "una",
      "nueva",
      "sesión",
      "usamos",
      "session",
      "control",
      "start.",
      "[AUDIO",
      "SOLAMENTE:",
      "Narración",
      "sobre",
      "pantalla",
      "de",
      "Bob",
      "cargando]",
      "Sin",
      "el",
    ];
    const cursor = script.indexOf("proyecto");
    const result = advanceFromCursor(
      ["proyecto", "con", "memoria", "en", "work", "para", "que", "los"],
      script,
      cursor,
    );
    expect(result?.wordIndex).toBeLessThan(cursor + MAX_FORWARD_WORD_JUMP);
    expect(result && shouldAcceptWordMatch(result, cursor)).toBe(true);
  });
});

describe("matchTranscriptToWordIndex", () => {
  it("finds the spoken position from a rolling transcript window", () => {
    const result = matchTranscriptToWordIndex(
      ["enfatizamos", "en", "el", "uso"],
      ["Hoy", "enfatizamos", "en", "el", "uso", "de", "Bob"],
      0,
    );
    expect(result?.wordIndex).toBe(4);
  });

  it("returns null for empty transcript", () => {
    expect(matchTranscriptToWordIndex([], SCRIPT, 0)).toBeNull();
  });
});

describe("wordsMatchLenient", () => {
  it("requires exact match for short function words", () => {
    expect(wordsMatchLenient("en", "en")).toBe(true);
    expect(wordsMatchLenient("en", "el")).toBe(false);
  });

  it("allows mild typos on longer words", () => {
    expect(wordsMatchLenient("adjetivo", "argentino")).toBe(true);
  });
});

describe("isSkippableScriptToken", () => {
  it("skips pipes, brackets, and bare numbers", () => {
    expect(isSkippableScriptToken("|")).toBe(true);
    expect(isSkippableScriptToken("11")).toBe(true);
    expect(isSkippableScriptToken("[CARD")).toBe(true);
    expect(isSkippableScriptToken("estandares")).toBe(false);
  });
});

describe("shouldAcceptWordMatch", () => {
  it("rejects jumps larger than SKIP_AHEAD_SEARCH_LIMIT", () => {
    expect(shouldAcceptWordMatch(matchResult({ wordIndex: 506, score: 0.9, matchedWords: 10 }), 182)).toBe(
      false,
    );
    expect(matchRejectReason(matchResult({ wordIndex: 506, score: 0.9, matchedWords: 10 }), 182)).toBe(
      "jump_too_far",
    );
  });

  it("accepts skip-ahead jumps with strong multi-word alignment", () => {
    const jump = MAX_FORWARD_WORD_JUMP + 8;
    expect(
      shouldAcceptWordMatch(
        matchResult({
          wordIndex: 199 + jump,
          score: 0.75,
          matchedWords: MIN_SKIP_AHEAD_MATCH,
          distinctiveMatchedWords: MIN_SKIP_AHEAD_DISTINCTIVE,
        }),
        199,
      ),
    ).toBe(true);
  });

  it("rejects skip-ahead jumps with only function-word matches", () => {
    expect(
      shouldAcceptWordMatch(
        matchResult({
          wordIndex: 517,
          score: 0.5,
          matchedWords: MIN_SKIP_AHEAD_MATCH,
          distinctiveMatchedWords: 0,
        }),
        497,
      ),
    ).toBe(false);
    expect(
      matchRejectReason(
        matchResult({
          wordIndex: 517,
          score: 0.5,
          matchedWords: MIN_SKIP_AHEAD_MATCH,
          distinctiveMatchedWords: 0,
        }),
        497,
      ),
    ).toBe("weak_skip_distinctive");
  });

  it("rejects skip-ahead jumps with only one matched word", () => {
    expect(shouldAcceptWordMatch(matchResult({ wordIndex: 210, score: 0.5, matchedWords: 1 }), 199)).toBe(
      false,
    );
    expect(matchRejectReason(matchResult({ wordIndex: 213, score: 0.5, matchedWords: 1 }), 199)).toBe(
      "weak_skip_match",
    );
  });

  it("accepts small sequential steps with partial scores", () => {
    expect(shouldAcceptWordMatch(matchResult({ wordIndex: 186, score: 0.3, matchedWords: 2 }), 182)).toBe(
      true,
    );
  });

  it("accepts a one-word step from the SR tail", () => {
    expect(shouldAcceptWordMatch(matchResult({ wordIndex: 190, score: 0.125, matchedWords: 1 }), 189)).toBe(
      true,
    );
  });
});
