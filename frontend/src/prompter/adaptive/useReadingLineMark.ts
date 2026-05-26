import { useLayoutEffect, type RefObject } from "react";

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
 * Clears the mark during silence so baseline scrolling can bring the next paragraph into view.
 */
export function useReadingLineMark({
  scriptRootRef,
  readingWordIndex,
  engaged,
  scriptWordsVersion,
}: UseReadingLineMarkOptions): void {
  useLayoutEffect(() => {
    syncLogOnChange("mark.readingWordIndex", readingWordIndex, "readingWordIndex changed");
  }, [readingWordIndex]);

  useLayoutEffect(() => {
    const root = scriptRootRef.current;
    if (!root) {
      return;
    }

    if (!engaged) {
      clearReadingLineMark(root);
      syncLog("mark.clear", { reason: "disengaged" });
      return;
    }

    if (readingWordIndex === null) {
      clearReadingLineMark(root);
      syncLog("mark.clear", { reason: "silence" });
      return;
    }

    const anchor = markReadingLine(root, readingWordIndex);
    syncLog("mark.line", {
      wordIndex: readingWordIndex,
      found: Boolean(anchor),
      word: anchor?.textContent,
    });
  }, [scriptRootRef, engaged, readingWordIndex, scriptWordsVersion]);
}
