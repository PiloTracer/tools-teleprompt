import { normalize } from "./normalize";

export const DEFAULT_MIN_MATCH_SCORE = 0.35;

export type WordMatchResult = {
  wordIndex: number;
  score: number;
  matchedWords: number;
  distinctiveMatchedWords: number;
};

/** Max script words the cursor may advance in one SR event (sequential reading). */
export const MAX_FORWARD_WORD_JUMP = 18;

/** How far ahead to search when the user skips metadata or non-spoken lines. */
export const SKIP_AHEAD_SEARCH_LIMIT = 100;

/** Min aligned tail words required to accept a jump past MAX_FORWARD_WORD_JUMP. */
export const MIN_SKIP_AHEAD_MATCH = 4;

/** Min non-function-word hits required for a skip-ahead re-lock. */
export const MIN_SKIP_AHEAD_DISTINCTIVE = 2;

/** Recent SR tail — only these words drive steady advance. */
export const ADVANCE_TAIL_WORDS = 12;

/** Max sequential word advances per SR tick (catch-up within one utterance). */
export const MAX_ADVANCE_STEPS_PER_TICK = 8;

/** Min consecutive matches to lock on before calibrated. */
export const MIN_INITIAL_LOCK_RUN = 3;

/** How far into the script to search for the opening lock-on. */
export const INITIAL_LOCK_SEARCH_LIMIT = 250;

/** Allowed skipped word (SR typo or missed script token) per alignment. */
export const MAX_ALIGN_GAPS = 1;

/** Steady reading tolerates more SR substitutions than initial lock-on. */
export const MAX_STEADY_ALIGN_GAPS = 3;

const FUNCTION_WORDS = new Set([
  "a",
  "al",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "con",
  "de",
  "del",
  "e",
  "el",
  "en",
  "es",
  "esta",
  "este",
  "esto",
  "for",
  "from",
  "ha",
  "has",
  "have",
  "in",
  "is",
  "la",
  "las",
  "le",
  "les",
  "lo",
  "los",
  "me",
  "no",
  "nos",
  "o",
  "of",
  "on",
  "or",
  "para",
  "por",
  "que",
  "se",
  "si",
  "sin",
  "son",
  "su",
  "te",
  "the",
  "to",
  "un",
  "una",
  "uno",
  "u",
  "y",
  "ya",
]);

export function isFunctionWord(word: string): boolean {
  const w = normalize(word);
  return w.length > 0 && FUNCTION_WORDS.has(w);
}

/** Spoken word that anchors alignment — not a short function word. */
export function isDistinctiveSpokenWord(word: string): boolean {
  const w = normalize(word);
  if (!w || w.length <= 3) {
    return false;
  }
  return !isFunctionWord(w);
}

/** Script token the reader never speaks aloud. */
export function isUnspokenScriptWord(raw: string): boolean {
  const trimmed = raw.trim();
  if (isSkippableScriptToken(trimmed)) {
    return true;
  }
  return trimmed.startsWith("[");
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i += 1) {
    const curr = [i + 1];
    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      curr[j + 1] = Math.min(
        (prev[j + 1] ?? 0) + 1,
        (curr[j] ?? 0) + 1,
        (prev[j] ?? 0) + cost,
      );
    }
    prev = curr;
  }
  return prev[b.length] ?? 0;
}

export function wordSimilarity(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) {
    return 1;
  }
  if (maxLen <= 3) {
    return 0;
  }
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/** Exact match for initial lock-on. */
export function wordsMatchStrict(spoken: string, script: string): boolean {
  const a = normalize(spoken);
  const b = normalize(script);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  if (a.length >= 5 && b.length >= 5) {
    return wordSimilarity(a, b) >= 0.78;
  }
  return false;
}

/** Lenient match for steady reading — tolerates common SR mis-hearings. */
export function wordsMatchLenient(spoken: string, script: string): boolean {
  const a = normalize(spoken);
  const b = normalize(script);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  if (a.length >= 8 || b.length >= 8) {
    return wordSimilarity(a, b) >= 0.55;
  }
  if (a.length >= 5 && b.length >= 5) {
    return wordSimilarity(a, b) >= 0.68;
  }
  if (a.length >= 4 && b.length >= 4) {
    return wordSimilarity(a, b) >= 0.62;
  }
  if (a.length >= 2 && b.length >= 2) {
    const shorter = a.length <= b.length ? a : b;
    const longer = a.length <= b.length ? b : a;
    if (longer.startsWith(shorter) && longer.length - shorter.length <= 2) {
      return true;
    }
  }
  return false;
}

/** Script tokens the speaker usually skips (markdown, pipes, URLs). */
export function isSkippableScriptToken(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return true;
  }
  if (trimmed === "|" || /^[|[\]()]+$/.test(trimmed)) {
    return true;
  }
  if (trimmed.startsWith("[") || trimmed.endsWith("]") || trimmed.includes("|")) {
    return true;
  }
  if (/^\d+$/.test(trimmed)) {
    return true;
  }
  const w = normalize(trimmed);
  if (!w) {
    return true;
  }
  if (w.includes("github") || w.includes(".com") || w.includes("http") || w.includes("www")) {
    return true;
  }
  return false;
}

/** Script token that is often misheard by SR (product names, etc.). */
function isLikelyProperName(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.length >= 2 && trimmed[0] === trimmed[0].toUpperCase() && /[A-Z]/.test(trimmed[0] ?? "");
}

export function shouldAcceptWordMatch(
  matched: WordMatchResult,
  cursorWord: number,
  isInitialLock = false,
): boolean {
  const forwardJump = matched.wordIndex - cursorWord;
  if (forwardJump <= 0) {
    return false;
  }
  if (isInitialLock) {
    return matched.score >= 0.5;
  }
  if (forwardJump > SKIP_AHEAD_SEARCH_LIMIT) {
    return false;
  }
  if (forwardJump > MAX_FORWARD_WORD_JUMP) {
    return (
      matched.matchedWords >= minSkipAheadMatchedWords(forwardJump) &&
      matched.distinctiveMatchedWords >= MIN_SKIP_AHEAD_DISTINCTIVE &&
      matched.score >= 0.375
    );
  }
  if (forwardJump <= 6 && matched.matchedWords >= 1) {
    return true;
  }
  if (forwardJump <= MAX_FORWARD_WORD_JUMP && matched.matchedWords >= 2) {
    return matched.score >= 0.2;
  }
  return false;
}

export function matchRejectReason(
  matched: WordMatchResult,
  cursorWord: number,
  isInitialLock = false,
): string {
  const forwardJump = matched.wordIndex - cursorWord;
  if (forwardJump <= 0) {
    return "backward";
  }
  if (!isInitialLock && forwardJump > SKIP_AHEAD_SEARCH_LIMIT) {
    return "jump_too_far";
  }
  if (
    !isInitialLock &&
    forwardJump > MAX_FORWARD_WORD_JUMP &&
    matched.matchedWords < minSkipAheadMatchedWords(forwardJump)
  ) {
    return "weak_skip_match";
  }
  if (
    !isInitialLock &&
    forwardJump > MAX_FORWARD_WORD_JUMP &&
    matched.distinctiveMatchedWords < MIN_SKIP_AHEAD_DISTINCTIVE
  ) {
    return "weak_skip_distinctive";
  }
  if (matched.score < 0.25) {
    return "score_low";
  }
  return "unknown";
}

function minSkipAheadMatchedWords(forwardJump: number): number {
  if (forwardJump <= 30) {
    return MIN_SKIP_AHEAD_MATCH;
  }
  if (forwardJump <= 60) {
    return MIN_SKIP_AHEAD_MATCH + 1;
  }
  return MIN_SKIP_AHEAD_MATCH + 2;
}

type AlignResult = {
  endIndex: number;
  matchedWords: number;
  distinctiveMatchedWords: number;
};

function isSkippableForAlignment(raw: string, metaOnlyWords?: Set<string>): boolean {
  if (isSkippableScriptToken(raw)) {
    return true;
  }
  const w = normalize(raw.trim());
  return w.length > 0 && metaOnlyWords?.has(w) === true;
}

/** Longest aligned run from scriptStart, allowing one gap (skip script or spoken word). */
function alignWithGaps(
  spoken: string[],
  scriptWords: string[],
  scriptStart: number,
  maxScriptEnd: number,
  matchWord: (a: string, b: string) => boolean,
  maxGaps = MAX_ALIGN_GAPS,
  metaOnlyWords?: Set<string>,
): AlignResult {
  let best: AlignResult = {
    endIndex: scriptStart - 1,
    matchedWords: 0,
    distinctiveMatchedWords: 0,
  };

  for (let spokenStart = 0; spokenStart < spoken.length; spokenStart += 1) {
    let scriptIdx = scriptStart;
    let spokenIdx = spokenStart;
    let matchedWords = 0;
    let distinctiveMatchedWords = 0;
    let gaps = 0;
    let lastMatchedIndex = scriptStart - 1;

    while (spokenIdx < spoken.length && scriptIdx <= maxScriptEnd) {
      while (
        scriptIdx <= maxScriptEnd &&
        isSkippableForAlignment(scriptWords[scriptIdx] ?? "", metaOnlyWords)
      ) {
        scriptIdx += 1;
      }
      if (scriptIdx > maxScriptEnd) {
        break;
      }

      const s = spoken[spokenIdx]!;
      const w = scriptWords[scriptIdx] ?? "";

      if (matchWord(s, w)) {
        matchedWords += 1;
        if (isDistinctiveSpokenWord(s)) {
          distinctiveMatchedWords += 1;
        }
        lastMatchedIndex = scriptIdx;
        spokenIdx += 1;
        scriptIdx += 1;
        continue;
      }

      if (gaps >= maxGaps) {
        break;
      }

      const nextScript = scriptWords[scriptIdx + 1] ?? "";
      if (scriptIdx + 1 <= maxScriptEnd && matchWord(s, nextScript)) {
        gaps += 1;
        scriptIdx += 1;
        continue;
      }

      const nextSpoken = spoken[spokenIdx + 1] ?? "";
      if (spokenIdx + 1 < spoken.length && matchWord(nextSpoken, w)) {
        gaps += 1;
        spokenIdx += 1;
        continue;
      }

      if (isLikelyProperName(w)) {
        gaps += 1;
        scriptIdx += 1;
        continue;
      }

      if (s.length <= 2 && gaps < maxGaps) {
        gaps += 1;
        spokenIdx += 1;
        continue;
      }

      break;
    }

    const endIndex = lastMatchedIndex;
    if (
      matchedWords > 0 &&
      (endIndex > best.endIndex ||
        (endIndex === best.endIndex && matchedWords > best.matchedWords) ||
        (endIndex === best.endIndex &&
          matchedWords === best.matchedWords &&
          distinctiveMatchedWords > best.distinctiveMatchedWords))
    ) {
      best = { endIndex, matchedWords, distinctiveMatchedWords };
    }
  }

  return best;
}

function findBestAlignment(
  tail: string[],
  scriptWords: string[],
  searchStart: number,
  searchEnd: number,
  metaOnlyWords?: Set<string>,
): AlignResult | null {
  let best: AlignResult | null = null;

  for (let scriptStart = searchStart; scriptStart <= searchEnd; scriptStart += 1) {
    const aligned = alignWithGaps(
      tail,
      scriptWords,
      scriptStart,
      searchEnd,
      wordsMatchLenient,
      MAX_STEADY_ALIGN_GAPS,
      metaOnlyWords,
    );
    if (aligned.matchedWords === 0) {
      continue;
    }
    if (isUnspokenScriptWord(scriptWords[aligned.endIndex] ?? "")) {
      continue;
    }
    if (
      !best ||
      aligned.matchedWords > best.matchedWords ||
      (aligned.matchedWords === best.matchedWords &&
        aligned.distinctiveMatchedWords > best.distinctiveMatchedWords) ||
      (aligned.matchedWords === best.matchedWords &&
        aligned.distinctiveMatchedWords === best.distinctiveMatchedWords &&
        aligned.endIndex < best.endIndex)
    ) {
      best = aligned;
    }
  }

  return best;
}

function toWordMatchResult(aligned: AlignResult, tailLength: number): WordMatchResult {
  return {
    wordIndex: aligned.endIndex,
    score: aligned.matchedWords / Math.max(tailLength, 1),
    matchedWords: aligned.matchedWords,
    distinctiveMatchedWords: aligned.distinctiveMatchedWords,
  };
}

export function findInitialLock(
  transcriptWords: string[],
  scriptWords: string[],
): WordMatchResult | null {
  const spoken = transcriptWords.map(normalize).filter(Boolean);
  if (spoken.length < MIN_INITIAL_LOCK_RUN || scriptWords.length === 0) {
    return null;
  }

  const searchEnd = Math.min(INITIAL_LOCK_SEARCH_LIMIT, scriptWords.length - 1);
  let bestStart = -1;
  let bestEndIndex = -1;
  let bestRun = 0;

  for (let scriptStart = 0; scriptStart <= searchEnd; scriptStart += 1) {
    const aligned = alignWithGaps(
      spoken,
      scriptWords,
      scriptStart,
      Math.min(scriptStart + spoken.length + MAX_ALIGN_GAPS + 2, scriptWords.length - 1),
      wordsMatchStrict,
    );
    if (
      aligned.matchedWords >= MIN_INITIAL_LOCK_RUN &&
      (bestStart < 0 ||
        scriptStart < bestStart ||
        (scriptStart === bestStart && aligned.matchedWords > bestRun))
    ) {
      bestStart = scriptStart;
      bestEndIndex = aligned.endIndex;
      bestRun = aligned.matchedWords;
    }
  }

  if (bestStart < 0 || bestEndIndex < 0) {
    return null;
  }

  return {
    wordIndex: bestEndIndex,
    score: Math.min(1, bestRun / spoken.length),
    matchedWords: bestRun,
    distinctiveMatchedWords: 0,
  };
}

/**
 * After lock-on: align the recent SR tail within the forward window.
 * Prefers the strongest alignment; tie-breaks to the nearest position.
 */
export function advanceFromCursor(
  transcriptWords: string[],
  scriptWords: string[],
  cursorWord: number,
  metaOnlyWords?: Set<string>,
): WordMatchResult | null {
  const spoken = transcriptWords.map(normalize).filter(Boolean);
  if (spoken.length === 0 || cursorWord >= scriptWords.length - 1) {
    return null;
  }

  const tail = spoken.slice(-ADVANCE_TAIL_WORDS);
  const sequentialEnd = Math.min(
    cursorWord + MAX_FORWARD_WORD_JUMP,
    scriptWords.length - 1,
  );
  const skipEnd = Math.min(cursorWord + SKIP_AHEAD_SEARCH_LIMIT, scriptWords.length - 1);

  const sequential = findBestAlignment(
    tail,
    scriptWords,
    cursorWord + 1,
    sequentialEnd,
    metaOnlyWords,
  );

  if (sequential && sequential.matchedWords >= 2) {
    return toWordMatchResult(sequential, tail.length);
  }

  if (sequential && sequential.matchedWords >= 1) {
    const jump = sequential.endIndex - cursorWord;
    if (jump >= 1 && jump <= 8) {
      return toWordMatchResult(sequential, tail.length);
    }
  }

  const skipAhead = findBestAlignment(
    tail,
    scriptWords,
    cursorWord + 1,
    skipEnd,
    metaOnlyWords,
  );

  if (skipAhead) {
    const forwardJump = skipAhead.endIndex - cursorWord;
    if (forwardJump <= MAX_FORWARD_WORD_JUMP) {
      return toWordMatchResult(skipAhead, tail.length);
    }
    if (
      shouldAcceptWordMatch(toWordMatchResult(skipAhead, tail.length), cursorWord) &&
      (!sequential || skipAhead.matchedWords > sequential.matchedWords)
    ) {
      return toWordMatchResult(skipAhead, tail.length);
    }
  }

  if (sequential && sequential.matchedWords >= 1) {
    return toWordMatchResult(sequential, tail.length);
  }

  return null;
}

/**
 * Advance the cursor repeatedly while each step is accepted — catches up when SR
 * dumps a multi-word phrase in one result.
 */
export function advanceRepeatedlyFromCursor(
  transcriptWords: string[],
  scriptWords: string[],
  cursorWord: number,
  metaOnlyWords?: Set<string>,
  maxSteps = MAX_ADVANCE_STEPS_PER_TICK,
): WordMatchResult | null {
  let cursor = cursorWord;
  let last: WordMatchResult | null = null;

  for (let step = 0; step < maxSteps; step += 1) {
    const matched = advanceFromCursor(transcriptWords, scriptWords, cursor, metaOnlyWords);
    if (matched === null || !shouldAcceptWordMatch(matched, cursor)) {
      break;
    }
    if (matched.wordIndex <= cursor) {
      break;
    }
    last = matched;
    cursor = matched.wordIndex;
  }

  return last;
}

/** @deprecated Used by tests — delegates to sequential advance. */
export function matchTranscriptToWordIndex(
  transcriptWords: string[],
  scriptWords: string[],
  cursorWord: number,
): WordMatchResult | null {
  if (cursorWord === 0) {
    return findInitialLock(transcriptWords, scriptWords);
  }
  return advanceFromCursor(transcriptWords, scriptWords, cursorWord);
}

/** @deprecated alias */
export function wordsMatch(spoken: string, script: string): boolean {
  return wordsMatchLenient(spoken, script);
}
