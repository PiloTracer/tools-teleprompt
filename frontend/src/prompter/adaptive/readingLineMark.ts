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

/** First word on the marked reading line with the highest word index (leading edge). */
export function findMarkedReadingLine(scriptRoot: HTMLElement): HTMLElement | null {
  const marked = scriptRoot.querySelectorAll<HTMLElement>(`.${READING_LINE_CLASS}`);
  if (marked.length === 0) {
    return null;
  }

  let lead = marked[0]!;
  let leadIndex = Number(lead.dataset.word ?? -1);
  for (const candidate of marked) {
    const index = Number(candidate.dataset.word ?? -1);
    if (index > leadIndex) {
      lead = candidate;
      leadIndex = index;
    }
  }

  const lineWords = getReadingLineWordElements(lead, scriptRoot);
  return lineWords[0] ?? lead;
}
