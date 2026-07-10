import { describe, expect, it } from "vitest";

import {
  dedupeTranscript,
  isAndroidChromeFakeFinal,
  mergeSpeechResults,
  normalizeWords,
} from "../../src/prompter/adaptive/speechResultUtils";

function makeAlternative(transcript: string, confidence = 0.8): SpeechRecognitionAlternative {
  return { transcript, confidence } as SpeechRecognitionAlternative;
}

function makeResult(
  isFinal: boolean,
  alternatives: SpeechRecognitionAlternative[],
): SpeechRecognitionResult {
  return {
    isFinal,
    length: alternatives.length,
    [0]: alternatives[0],
    [1]: alternatives[1],
  } as unknown as SpeechRecognitionResult;
}

function makeEvent(
  resultIndex: number,
  results: SpeechRecognitionResult[],
): SpeechRecognitionEvent {
  return {
    resultIndex,
    results: results as unknown as SpeechRecognitionResultList,
  } as SpeechRecognitionEvent;
}

describe("isAndroidChromeFakeFinal", () => {
  it("returns false for interim results", () => {
    const result = makeResult(false, [makeAlternative("hola mundo")]);
    expect(isAndroidChromeFakeFinal(result)).toBe(false);
  });

  it("returns true for a single-alternative final with confidence 0", () => {
    const result = makeResult(true, [makeAlternative("hola mundo", 0)]);
    expect(isAndroidChromeFakeFinal(result)).toBe(true);
  });

  it("returns false for a real final with non-zero confidence", () => {
    const result = makeResult(true, [makeAlternative("hola mundo", 0.85)]);
    expect(isAndroidChromeFakeFinal(result)).toBe(false);
  });

  it("returns false for a multi-alternative final even if first confidence is 0", () => {
    const result = makeResult(true, [
      makeAlternative("hola mundo", 0),
      makeAlternative("ola mundo", 0.3),
    ]);
    expect(isAndroidChromeFakeFinal(result)).toBe(false);
  });

  it("returns true for an empty final result", () => {
    const result = makeResult(true, []);
    expect(isAndroidChromeFakeFinal(result)).toBe(true);
  });
});

describe("dedupeTranscript", () => {
  it("returns all words when there is no previous final", () => {
    const { words, dedupedCount } = dedupeTranscript(["hola", "mundo"], []);
    expect(words).toEqual(["hola", "mundo"]);
    expect(dedupedCount).toBe(0);
  });

  it("removes an exact duplicate of the previous final", () => {
    const { words, dedupedCount } = dedupeTranscript(["hola", "mundo"], ["hola", "mundo"]);
    expect(words).toEqual([]);
    expect(dedupedCount).toBe(2);
  });

  it("strips a prefix extension of the previous final", () => {
    const { words, dedupedCount } = dedupeTranscript(
      ["hola", "mundo", "como", "estas"],
      ["hola", "mundo"],
    );
    expect(words).toEqual(["como", "estas"]);
    expect(dedupedCount).toBe(2);
  });

  it("strips a suffix overlap of the previous final", () => {
    const { words, dedupedCount } = dedupeTranscript(
      ["mundo", "como", "estas"],
      ["hola", "mundo"],
    );
    expect(words).toEqual(["como", "estas"]);
    expect(dedupedCount).toBe(1);
  });

  it("keeps unrelated words unchanged", () => {
    const { words, dedupedCount } = dedupeTranscript(["buenos", "dias"], ["hola", "mundo"]);
    expect(words).toEqual(["buenos", "dias"]);
    expect(dedupedCount).toBe(0);
  });

  it("handles repeated single word extension", () => {
    const previous = ["hola"];
    const { words, dedupedCount } = dedupeTranscript(["hola", "mundo"], previous);
    expect(words).toEqual(["mundo"]);
    expect(dedupedCount).toBe(1);
  });
});

describe("mergeSpeechResults", () => {
  it("extracts final and interim words", () => {
    const event = makeEvent(0, [
      makeResult(true, [makeAlternative("hola mundo", 0.8)]),
      makeResult(false, [makeAlternative("como estas", 0.6)]),
    ]);
    const out = mergeSpeechResults(event, []);
    expect(out.finalWords).toEqual(["hola", "mundo"]);
    expect(out.interimWords).toEqual(["como", "estas"]);
    expect(out.acceptedFinalCount).toBe(1);
    expect(out.filteredFakeFinalCount).toBe(0);
    expect(out.dedupedCount).toBe(0);
  });

  it("filters fake finals and counts them", () => {
    const event = makeEvent(0, [
      makeResult(true, [makeAlternative("hola mundo", 0)]),
      makeResult(true, [makeAlternative("como estas", 0.7)]),
    ]);
    const out = mergeSpeechResults(event, []);
    expect(out.finalWords).toEqual(["como", "estas"]);
    expect(out.filteredFakeFinalCount).toBe(1);
    expect(out.acceptedFinalCount).toBe(1);
  });

  it("dedupes prefix extensions against previous final words", () => {
    const event = makeEvent(0, [
      makeResult(true, [makeAlternative("hola mundo como estas", 0.8)]),
    ]);
    const out = mergeSpeechResults(event, ["hola", "mundo"]);
    expect(out.finalWords).toEqual(["como", "estas"]);
    expect(out.dedupedCount).toBe(2);
  });

  it("skips event results before resultIndex", () => {
    const event = makeEvent(1, [
      makeResult(true, [makeAlternative("hola", 0.8)]),
      makeResult(true, [makeAlternative("mundo", 0.8)]),
    ]);
    const out = mergeSpeechResults(event, []);
    expect(out.finalWords).toEqual(["mundo"]);
  });

  it("returns empty arrays when there are no results", () => {
    const event = makeEvent(0, []);
    const out = mergeSpeechResults(event, []);
    expect(out.finalWords).toEqual([]);
    expect(out.interimWords).toEqual([]);
    expect(out.acceptedFinalCount).toBe(0);
  });

  it("preserves accepted final order across multiple results", () => {
    const event = makeEvent(0, [
      makeResult(true, [makeAlternative("uno dos", 0.8)]),
      makeResult(true, [makeAlternative("tres cuatro", 0.8)]),
    ]);
    const out = mergeSpeechResults(event, []);
    expect(out.finalWords).toEqual(["uno", "dos", "tres", "cuatro"]);
    expect(out.acceptedFinalCount).toBe(2);
  });
});

describe("normalizeWords", () => {
  it("normalizes case and removes punctuation", () => {
    expect(normalizeWords(["Hola!", "MUNDO", "¿cómo?"])).toEqual(["hola", "mundo", "como"]);
  });

  it("drops empty tokens", () => {
    expect(normalizeWords(["", "hola", "   "])).toEqual(["hola"]);
  });
});
