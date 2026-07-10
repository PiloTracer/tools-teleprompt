import { useEffect, useRef, type RefObject } from "react";

import { syncLogThrottled } from "./syncDebug";

export type VisibleWordRange = {
  firstWordIndex: number | null;
  lastWordIndex: number | null;
};

export type UseVisibleWordRangeOptions = {
  viewportRef: RefObject<HTMLElement | null>;
  scriptRootRef: RefObject<HTMLElement | null>;
  /** Observations run only while mic sync is engaged. */
  enabled: boolean;
};

function computeVisibleRange(
  viewport: HTMLElement,
  root: HTMLElement,
): VisibleWordRange {
  const viewportRect = viewport.getBoundingClientRect();
  const words = root.querySelectorAll<HTMLElement>(".tp-word");
  let firstWordIndex: number | null = null;
  let lastWordIndex: number | null = null;

  for (const el of words) {
    const rect = el.getBoundingClientRect();
    const intersects = rect.top <= viewportRect.bottom && rect.bottom >= viewportRect.top;
    if (!intersects) {
      continue;
    }
    const raw = el.dataset.word;
    const idx = raw === undefined ? Number.NaN : Number(raw);
    if (!Number.isFinite(idx)) {
      continue;
    }
    if (firstWordIndex === null || idx < firstWordIndex) {
      firstWordIndex = idx;
    }
    if (lastWordIndex === null || idx > lastWordIndex) {
      lastWordIndex = idx;
    }
  }

  return { firstWordIndex, lastWordIndex };
}

/**
 * Tracks which annotated script words are currently visible in the viewport.
 *
 * v1 scope: observability only. The range is logged as `sync.viewportRange`
 * and may be included in other sync debug logs. It is intentionally NOT wired
 * into matcher constraints in this phase.
 */
export function useVisibleWordRange({
  viewportRef,
  scriptRootRef,
  enabled,
}: UseVisibleWordRangeOptions): React.RefObject<VisibleWordRange> {
  const rangeRef = useRef<VisibleWordRange>({
    firstWordIndex: null,
    lastWordIndex: null,
  });

  useEffect(() => {
    if (!enabled) {
      rangeRef.current = { firstWordIndex: null, lastWordIndex: null };
      return;
    }

    const viewport = viewportRef.current;
    const root = scriptRootRef.current;
    if (!viewport || !root) {
      return;
    }

    const updateRange = () => {
      const next = computeVisibleRange(viewport, root);
      rangeRef.current = next;
      syncLogThrottled("sync.viewportRange", 1000, "sync.viewportRange", {
        firstWordIndex: next.firstWordIndex,
        lastWordIndex: next.lastWordIndex,
      });
    };

    const observer = new IntersectionObserver(updateRange, {
      root: viewport,
      threshold: 0,
    });

    const words = root.querySelectorAll<HTMLElement>(".tp-word");
    for (const el of words) {
      observer.observe(el);
    }

    // Initial range before any intersection event.
    updateRange();

    return () => {
      observer.disconnect();
      rangeRef.current = { firstWordIndex: null, lastWordIndex: null };
    };
  }, [enabled, viewportRef, scriptRootRef]);

  return rangeRef;
}
