import { describe, expect, it } from "vitest";

import {
  advanceFromCursor,
  advanceRepeatedlyFromCursor,
  findInitialLock,
  findRelockAnchoredToIndex,
  isSkippableScriptToken,
  matchRejectReason,
  matchTranscriptToWordIndex,
  MAX_FORWARD_WORD_JUMP,
  MIN_RELOCK_DISTINCTIVE,
  MIN_RELOCK_MATCH,
  MIN_SKIP_AHEAD_DISTINCTIVE,
  MIN_SKIP_AHEAD_MATCH,
  RELOCK_BACKWARD_VIEWPORT_GAP,
  shouldAcceptRelockMatch,
  shouldAcceptWordMatch,
  type WordMatchResult,
  wordsMatchLenient,
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

describe("findRelockAnchoredToIndex", () => {
  // Script designed to mimic a real script with three "blocks":
  //   - Block A (early content where the stale cursor was when silence began)
  //   - Block B (metadata-ish lines the lever scrolled past during silence)
  //   - Block C (the line the user actually resumes reading)
  const SCRIPT_BLOCK_A = [
    "Hoy",
    "presentamos",
    "nuestro",
    "nuevo",
    "producto",
    "que",
    "facilita",
    "el",
    "trabajo",
    "diario",
    "de",
    "los",
    "equipos",
    "creativos",
    "en",
    "la",
    "industria",
    "audiovisual",
    "y",
    "permite",
    "compartir",
    "guiones",
    "rapidamente",
    "con",
    "cualquier",
    "dispositivo",
    "movil",
    "conectado",
    "a",
    "la",
    "misma",
    "red",
    "domestica",
    "sin",
    "necesitar",
    "configuracion",
    "complicada",
    "ni",
    "instalaciones",
    "tediosas",
  ];
  const SCRIPT_BLOCK_B = [
    "Mostrar",
    "tarjeta",
    "cinco",
    "segundos",
    "Logo",
    "principal",
    "Subtitulo",
    "Autor",
    "Fecha",
    "Version",
    "Open",
    "source",
    "github",
    "punto",
    "com",
    "PiloTracer",
    "tools",
    "teleprompt",
    "Documentacion",
    "Ayuda",
    "Captura",
    "pantalla",
    "cargando",
    "Bob",
    "editor",
    "argentino",
    "Mostrar",
    "tarjeta",
    "cinco",
    "segundos",
    "Logo",
    "Subtitulo",
    "Autor",
    "Fecha",
    "Version",
    "PiloTracer",
    "tools",
    "teleprompt",
    "Logo",
    "principal",
  ];
  const SCRIPT_BLOCK_C = [
    "Continuamos",
    "explicando",
    "como",
    "funciona",
    "el",
    "sistema",
    "adaptativo",
    "basado",
    "en",
    "reconocimiento",
    "de",
    "voz",
    "para",
    "seguir",
    "el",
    "ritmo",
    "natural",
    "del",
    "presentador",
    "evitando",
    "interrupciones",
    "molestas",
    "durante",
    "la",
    "grabacion",
    "profesional",
    "del",
    "contenido",
    "final",
    "publicado",
  ];
  const SCRIPT = [...SCRIPT_BLOCK_A, ...SCRIPT_BLOCK_B, ...SCRIPT_BLOCK_C];
  const BLOCK_C_START = SCRIPT_BLOCK_A.length + SCRIPT_BLOCK_B.length;

  it("locks onto resumed speech far past the stale cursor", () => {
    const anchorIndex = BLOCK_C_START + 2;
    const result = findRelockAnchoredToIndex(
      ["continuamos", "explicando", "como", "funciona", "el", "sistema", "adaptativo"],
      SCRIPT,
      anchorIndex,
    );
    expect(result).not.toBeNull();
    expect(result?.wordIndex).toBeGreaterThanOrEqual(BLOCK_C_START);
    expect(result?.wordIndex).toBeLessThan(BLOCK_C_START + SCRIPT_BLOCK_C.length);
    expect(result?.matchedWords).toBeGreaterThanOrEqual(MIN_RELOCK_MATCH);
    expect(result?.distinctiveMatchedWords).toBeGreaterThanOrEqual(MIN_RELOCK_DISTINCTIVE);
  });

  it("does not snap back behind the anchor on function-word coincidences", () => {
    // Spoken text legitimately matches Block C, but Block A also has "el" / "en" / "la"
    // sprinkled. The anchor is in Block C; the result must stay near the anchor.
    const anchorIndex = BLOCK_C_START + 5;
    const result = findRelockAnchoredToIndex(
      ["el", "sistema", "adaptativo", "basado", "en", "reconocimiento"],
      SCRIPT,
      anchorIndex,
    );
    expect(result).not.toBeNull();
    expect(result?.wordIndex).toBeGreaterThanOrEqual(BLOCK_C_START);
  });

  it("rejects matches with only function-word coincidences (no distinctive run)", () => {
    const anchorIndex = BLOCK_C_START + 5;
    const result = findRelockAnchoredToIndex(
      ["el", "la", "de", "en", "y", "que"],
      SCRIPT,
      anchorIndex,
    );
    expect(result).toBeNull();
  });

  it("returns null when the spoken tail is too short", () => {
    const result = findRelockAnchoredToIndex(["sistema"], SCRIPT, 50);
    expect(result).toBeNull();
  });

  it("respects the search radius bound", () => {
    // Anchor far from where the real match sits; tiny radius keeps it out of reach.
    const anchorIndex = 0;
    const result = findRelockAnchoredToIndex(
      ["continuamos", "explicando", "como", "funciona"],
      SCRIPT,
      anchorIndex,
      4,
    );
    expect(result).toBeNull();
  });

  it("tie-breaks toward the candidate nearest the anchor", () => {
    // Two distinctive phrases that match the spoken tail: one early, one late.
    const tieScript = [
      "alpha",
      "presentamos",
      "nuevo",
      "producto",
      "creativo",
      "interesante",
      ...Array(80).fill(0).map((_, i) => `palabra${i}`),
      "presentamos",
      "nuevo",
      "producto",
      "creativo",
      "interesante",
      ...Array(20).fill(0).map((_, i) => `cola${i}`),
    ];
    const earlyMatchEnd = 5; // end of first "presentamos nuevo producto creativo interesante"
    const lateMatchStart = 1 + 5 + 80; // index of second "presentamos"
    const lateMatchEnd = lateMatchStart + 4;

    const earlyAnchorResult = findRelockAnchoredToIndex(
      ["presentamos", "nuevo", "producto", "creativo", "interesante"],
      tieScript,
      earlyMatchEnd + 2,
    );
    expect(earlyAnchorResult?.wordIndex).toBe(earlyMatchEnd);

    const lateAnchorResult = findRelockAnchoredToIndex(
      ["presentamos", "nuevo", "producto", "creativo", "interesante"],
      tieScript,
      lateMatchStart + 2,
    );
    expect(lateAnchorResult?.wordIndex).toBe(lateMatchEnd);
  });
});

describe("shouldAcceptRelockMatch", () => {
  function r(wordIndex: number, partial?: Partial<WordMatchResult>): WordMatchResult {
    return {
      wordIndex,
      score: 0.6,
      matchedWords: MIN_RELOCK_MATCH,
      distinctiveMatchedWords: MIN_RELOCK_DISTINCTIVE,
      ...partial,
    };
  }

  it("returns false for null match", () => {
    expect(shouldAcceptRelockMatch(null, 100, 100)).toBe(false);
  });

  it("accepts forward matches (anti-wobble does not block forward progress)", () => {
    expect(shouldAcceptRelockMatch(r(105), 100, 100)).toBe(true);
    expect(shouldAcceptRelockMatch(r(100), 100, 100)).toBe(true);
  });

  it("rejects backward match when viewport anchor is not behind cursor", () => {
    expect(shouldAcceptRelockMatch(r(98), 100, 100)).toBe(false);
    expect(shouldAcceptRelockMatch(r(98), 100, 110)).toBe(false);
  });

  it("rejects backward match when viewport is only slightly behind cursor", () => {
    const slightlyBack = 100 - (RELOCK_BACKWARD_VIEWPORT_GAP - 1);
    expect(shouldAcceptRelockMatch(r(95), 100, slightlyBack)).toBe(false);
  });

  it("accepts backward match when viewport itself moved significantly back", () => {
    const significantlyBack = 100 - (RELOCK_BACKWARD_VIEWPORT_GAP + 1);
    expect(shouldAcceptRelockMatch(r(60), 100, significantlyBack)).toBe(true);
  });

  it("respects a custom backward-gap tolerance override", () => {
    expect(shouldAcceptRelockMatch(r(95), 100, 90, 5)).toBe(true);
    expect(shouldAcceptRelockMatch(r(95), 100, 96, 5)).toBe(false);
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
    const cursor = 199;
    const beyondSequential = cursor + MAX_FORWARD_WORD_JUMP + 3;
    expect(
      shouldAcceptWordMatch(
        matchResult({ wordIndex: beyondSequential, score: 0.5, matchedWords: 1 }),
        cursor,
      ),
    ).toBe(false);
    expect(
      matchRejectReason(
        matchResult({ wordIndex: beyondSequential, score: 0.5, matchedWords: 1 }),
        cursor,
      ),
    ).toBe("weak_skip_match");
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
