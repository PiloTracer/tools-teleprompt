import { useLayoutEffect, useRef, type RefObject } from "react";

import { clearReadingLineMark, markReadingLine } from "./readingLineMark";
import { syncLog, syncLogOnChange } from "./syncDebug";

export type UseReadingLineMarkOptions = {
  scriptRootRef: RefObject<HTMLElement | null>;
  /** Live word index from speech tracker; null during silence. */
  readingWordIndex: number | null;
  /** When false, highlight is cleared. */
  engaged: boolean;
  /** Bump when script word spans are re-built. */
  scriptWordsVersion: number;
};

/**
 * Underlines the current reading line in red in the DOM.
 * Scroll follows this mark — not raw speech indices.
 * Holds the last mark through brief silence gaps.
 */
export function useReadingLineMark({
  scriptRootRef,
  readingWordIndex,
  engaged,
  scriptWordsVersion,
}: UseReadingLineMarkOptions): void {
  const heldWordIndexRef = useRef<number | null>(null);

  if (readingWordIndex !== null) {
    heldWordIndexRef.current = readingWordIndex;
  }

  useLayoutEffect(() => {
    syncLogOnChange("mark.readingWordIndex", readingWordIndex, "readingWordIndex changed");
  }, [readingWordIndex]);

  useLayoutEffect(() => {
    const root = scriptRootRef.current;
    if (!root) {
      return;
    }

    if (!engaged) {
      heldWordIndexRef.current = null;
      clearReadingLineMark(root);
      syncLog("mark.clear", { reason: "disengaged" });
      return;
    }

    const wordIndex = heldWordIndexRef.current;
    if (wordIndex === null) {
      clearReadingLineMark(root);
      return;
    }

    const anchor = markReadingLine(root, wordIndex);
    syncLog("mark.line", {
      wordIndex,
      found: Boolean(anchor),
      word: anchor?.textContent,
    });
  }, [scriptRootRef, engaged, readingWordIndex, scriptWordsVersion]);
}
