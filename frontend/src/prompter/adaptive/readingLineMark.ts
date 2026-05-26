import { findScriptWordElement } from "./annotateScriptWords";
import { getReadingLineWordElements } from "./computeTargetScroll";

export const READING_LINE_CLASS = "tp-word--reading";

/** Remove reading-line highlight from all words in the script. */
export function clearReadingLineMark(scriptRoot: HTMLElement): void {
  scriptRoot.querySelectorAll(`.${READING_LINE_CLASS}`).forEach((el) => {
    el.classList.remove(READING_LINE_CLASS);
  });
}

/**
 * Underline the full visual line containing `wordIndex`.
 * Returns the first word element on that line, or null when the word is missing.
 */
export function markReadingLine(
  scriptRoot: HTMLElement,
  wordIndex: number,
): HTMLElement | null {
  clearReadingLineMark(scriptRoot);
  const wordEl = findScriptWordElement(scriptRoot, wordIndex);
  if (!wordEl) {
    return null;
  }

  const lineWords = getReadingLineWordElements(wordEl, scriptRoot);
  for (const lineWord of lineWords) {
    lineWord.classList.add(READING_LINE_CLASS);
  }

  return lineWords[0] ?? wordEl;
}

/** All words currently highlighted as the reading line (small set — safe per frame). */
export function getMarkedReadingLineWords(scriptRoot: HTMLElement): HTMLElement[] {
  return Array.from(scriptRoot.querySelectorAll<HTMLElement>(`.${READING_LINE_CLASS}`));
}

function firstWordOnMarkedLine(marked: HTMLElement[]): HTMLElement {
  let anchor = marked[0]!;
  let anchorIndex = Number(anchor.dataset.word ?? Infinity);
  for (const candidate of marked) {
    const index = Number(candidate.dataset.word ?? Infinity);
    if (index < anchorIndex) {
      anchor = candidate;
      anchorIndex = index;
    }
  }
  return anchor;
}

/** Marked reading line in one DOM query (for per-frame scroll). */
export function getMarkedReadingLine(
  scriptRoot: HTMLElement,
): { anchor: HTMLElement; lineWords: HTMLElement[] } | null {
  const lineWords = getMarkedReadingLineWords(scriptRoot);
  if (lineWords.length === 0) {
    return null;
  }
  return { anchor: firstWordOnMarkedLine(lineWords), lineWords };
}

/** First word on the marked reading line (lowest word index among highlights). */
export function findMarkedReadingLine(scriptRoot: HTMLElement): HTMLElement | null {
  return getMarkedReadingLine(scriptRoot)?.anchor ?? null;
}
