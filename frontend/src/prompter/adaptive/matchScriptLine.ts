import type { ParsedScriptLine } from "./types";

/**
 * Unicode-safe normalisation for word matching.
 *
 * 1. NFD decomposition strips combining diacritical marks so accented chars
 *    match their base form in both the script and the transcript:
 *    "línea" → "linea", "también" → "tambien".
 * 2. Lowercase + strip non-alphanumeric to remove punctuation.
 *
 * This handles Spanish (and other Romance language) scripts correctly
 * even when SpeechRecognition returns unaccented variants.
 */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

/**
 * Find the script line that best matches the given transcript words.
 *
 * Strategy: scan a forward-biased window around the last known cursor line,
 * score each spoken line by the fraction of transcript words it contains,
 * return the highest-scoring match above the minimum confidence threshold.
 *
 * Only spoken lines are candidates; meta lines are skipped.
 */
/**
 * Find the script line that best matches the given transcript words.
 *
 * Scoring uses **recall** — the fraction of transcript words found in the
 * candidate line.  This correctly handles the common case where the reader
 * says a few distinctive words from a long line: all of them match → score 1.
 * A precision-only formula would penalise short transcripts against long lines.
 *
 * Minimum recall threshold: 40 % of transcript words must appear in the line.
 *
 * Search window: forward-biased (14 lines ahead, 3 lines back).  The forward
 * bias is intentional — it lets the matcher catch up when SR transcripts
 * arrive with ~200 ms–1.5 s latency.  Forward drift is constrained by the
 * top/bottom zone rules in the adaptive resolver, not by tightening the
 * search window (which previously caused initial calibration to fail for
 * mid-script reads, leaving `hasCalibrated` false and the mic button blue).
 */
export function matchTranscriptToLine(
  transcriptWords: string[],
  parsedLines: ParsedScriptLine[],
  cursorLine: number,
  searchWindowForward = 6,
  searchWindowBackward = 6,
  minScore = 0.4,
): number | null {
  const normalized = transcriptWords.map(normalize).filter(Boolean);
  if (normalized.length === 0) {
    return null;
  }

  const searchStart = Math.max(0, cursorLine - searchWindowBackward);
  const searchEnd = Math.min(parsedLines.length - 1, cursorLine + searchWindowForward);

  let bestLine: number | null = null;
  let bestScore = minScore;

  for (let i = searchStart; i <= searchEnd; i++) {
    if (parsedLines[i].kind !== "spoken") {
      continue;
    }
    const lineTokens = tokenize(parsedLines[i].text);
    if (lineTokens.length === 0) {
      continue;
    }
    const lineSet = new Set(lineTokens);
    // Recall: what fraction of the transcript words appear in this line?
    const matched = normalized.filter((w) => lineSet.has(w)).length;
    const score = matched / normalized.length;

    if (score >= bestScore) {
      bestScore = score;
      bestLine = i;
    }
  }

  return bestLine;
}
