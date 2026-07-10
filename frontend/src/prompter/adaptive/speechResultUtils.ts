import { normalize, tokenize } from "./normalize";

/**
 * Android Chrome promotes interim results to final with confidence === 0.
 * These fake finals repeat words the user already said and poison the matcher.
 */
export function isAndroidChromeFakeFinal(result: SpeechRecognitionResult): boolean {
  if (!result.isFinal) {
    return false;
  }
  if (result.length === 0) {
    return true;
  }
  // Only the single-alternative final emitted by Chrome's fake promotion has
  // zero confidence; real finals usually carry a non-zero confidence value.
  if (result.length === 1 && result[0].confidence === 0) {
    return true;
  }
  return false;
}

/**
 * Chrome often emits a final transcript that is an extension of the previous
 * final, e.g. previous = ["hola", "mundo"], next = ["hola", "mundo", "como"].
 * Strip the overlapping prefix so only genuinely new words are processed.
 */
function stripPrefixOverlap(newWords: string[], previousFinalWords: string[]): string[] {
  if (previousFinalWords.length === 0) {
    return newWords;
  }
  if (newWords.length === 0) {
    return newWords;
  }

  // Exact duplicate.
  if (
    newWords.length === previousFinalWords.length &&
    newWords.every((w, i) => w === previousFinalWords[i])
  ) {
    return [];
  }

  // Find the longest suffix of previousFinalWords that matches a prefix of newWords.
  for (let overlap = previousFinalWords.length; overlap > 0; overlap -= 1) {
    const suffix = previousFinalWords.slice(-overlap);
    if (suffix.length > newWords.length) {
      continue;
    }
    const prefix = newWords.slice(0, suffix.length);
    if (suffix.every((w, i) => w === prefix[i])) {
      return newWords.slice(suffix.length);
    }
  }

  return newWords;
}

/**
 * Remove words already present in the previous accepted final transcript.
 * Returns only the net-new words to feed into the matcher buffer.
 */
export function dedupeTranscript(
  words: string[],
  previousFinalWords: string[],
): { words: string[]; dedupedCount: number } {
  const stripped = stripPrefixOverlap(words, previousFinalWords);
  const dedupedCount = words.length - stripped.length;
  return { words: stripped, dedupedCount };
}

export type MergeSpeechResultsOutput = {
  /** New final words accepted after filtering and dedup. */
  finalWords: string[];
  /** Current interim words (not stored across results). */
  interimWords: string[];
  /** Number of final results accepted. */
  acceptedFinalCount: number;
  /** Number of fake finals discarded. */
  filteredFakeFinalCount: number;
  /** Number of words removed as duplicates / prefix extensions. */
  dedupedCount: number;
};

/**
 * Process a SpeechRecognition result event:
 * 1. Drop Android Chrome fake finals (confidence === 0).
 * 2. Strip prefix overlaps against the previously accepted final transcript.
 * 3. Return clean final + interim word arrays for matching.
 */
export function mergeSpeechResults(
  event: SpeechRecognitionEvent,
  previousFinalWords: string[],
): MergeSpeechResultsOutput {
  const out: MergeSpeechResultsOutput = {
    finalWords: [],
    interimWords: [],
    acceptedFinalCount: 0,
    filteredFakeFinalCount: 0,
    dedupedCount: 0,
  };

  let rawFinalText = "";
  let rawInterimText = "";

  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    if (result.isFinal) {
      if (isAndroidChromeFakeFinal(result)) {
        out.filteredFakeFinalCount += 1;
        continue;
      }
      const text = result[0]?.transcript ?? "";
      rawFinalText += text + " ";
      out.acceptedFinalCount += 1;
    } else {
      const text = result[0]?.transcript ?? "";
      rawInterimText += text + " ";
    }
  }

  const rawFinalWords = tokenize(rawFinalText);
  const deduped = dedupeTranscript(rawFinalWords, previousFinalWords);
  out.finalWords = deduped.words;
  out.dedupedCount = deduped.dedupedCount;

  out.interimWords = tokenize(rawInterimText);

  return out;
}

/**
 * Normalize words for stable dedup comparison. Punctuation and case differences
 * should not cause duplicates to slip through.
 */
export function normalizeWords(words: string[]): string[] {
  return words.map(normalize).filter(Boolean);
}
