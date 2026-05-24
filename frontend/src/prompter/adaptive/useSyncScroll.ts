import { useEffect, useRef, type RefObject } from "react";

import {
  applySmoothScrollTowardTarget,
  computeReadingLineTargetScrollTop,
  isReadingLineCentered,
  READ_CENTER_RATIO,
} from "./computeTargetScroll";
import { findMarkedReadingLine } from "./readingLineMark";
import {
  syncLog,
  syncLogBootOnce,
  syncLogOnChange,
  syncLogThrottled,
} from "./syncDebug";
import {
  applyScrollStep,
  BASE_SCROLL_PX_PER_SEC,
  clampScrollSpeed,
} from "../useScroll";
import { prefersReducedMotion } from "../motion";

export type UseSyncScrollOptions = {
  viewportRef: RefObject<HTMLElement | null>;
  scriptRootRef: RefObject<HTMLElement | null>;
  isPlaying: boolean;
  speed: number;
  /** Mic sync engaged — when false, fixed-speed scroll only. */
  syncEngaged: boolean;
};

function lineCenterRatio(lineEl: HTMLElement, viewport: HTMLElement): number {
  const viewportRect = viewport.getBoundingClientRect();
  if (viewportRect.height <= 0) {
    return 0;
  }
  const lineRect = lineEl.getBoundingClientRect();
  const centerY = lineRect.top + lineRect.height / 2;
  return (centerY - viewportRect.top) / viewportRect.height;
}

/**
 * Drives player scroll from the red reading-line mark in the DOM:
 * find marked line → measure vs target band → smooth scroll.
 */
export function useSyncScroll({
  viewportRef,
  scriptRootRef,
  isPlaying,
  speed,
  syncEngaged,
}: UseSyncScrollOptions): void {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const leverCarryRef = useRef(0);
  const trackCarryRef = useRef(0);
  const speedRef = useRef(speed);
  const lastModeRef = useRef<"track" | "lever" | null>(null);
  const lastMarkedWordRef = useRef<string | null>(null);

  speedRef.current = speed;

  useEffect(() => {
    syncLogBootOnce();
    syncLogOnChange("scroll.playing", isPlaying, "scroll.playing");
    syncLogOnChange("scroll.syncEngaged", syncEngaged, "scroll.syncEngaged");
  }, [isPlaying, syncEngaged]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isPlaying) {
      lastTimeRef.current = null;
      leverCarryRef.current = 0;
      trackCarryRef.current = 0;
      lastModeRef.current = null;
      lastMarkedWordRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const motionQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    let reducedMotion = prefersReducedMotion();

    const onMotionPreferenceChange = () => {
      reducedMotion = motionQuery?.matches ?? false;
    };
    motionQuery?.addEventListener("change", onMotionPreferenceChange);

    syncLog("scroll.loop.start", {
      syncEngaged,
      reducedMotion,
      speed: speedRef.current,
    });

    const tick = (time: number) => {
      const el = viewportRef.current;
      const root = scriptRootRef.current;
      if (!el) {
        return;
      }

      if (lastTimeRef.current !== null && !reducedMotion) {
        const deltaSec = Math.min((time - lastTimeRef.current) / 1000, 0.05);
        const lineEl = root ? findMarkedReadingLine(root) : null;
        const mode: "track" | "lever" = lineEl !== null ? "track" : "lever";

        if (lastModeRef.current !== mode) {
          syncLog("scroll.mode", {
            mode,
            syncEngaged,
            hasMarkedLine: lineEl !== null,
            awaitingMatch: syncEngaged && lineEl === null,
          });
          lastModeRef.current = mode;
        }

        const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
        const scrollPct =
          maxScroll > 0 ? Number(((el.scrollTop / maxScroll) * 100).toFixed(1)) : 0;
        const markedIndex = lineEl?.dataset.word ?? null;

        syncLogThrottled("sync.heartbeat", 3000, "sync.heartbeat", {
          mode,
          markedWordIndex: markedIndex,
          scrollTop: Math.round(el.scrollTop),
          maxScroll: Math.round(maxScroll),
          scrollPct,
          syncEngaged,
        });

        if (lineEl && root) {
          const wordKey = lineEl.dataset.word ?? lineEl.textContent ?? "";
          if (lastMarkedWordRef.current !== wordKey) {
            syncLog("scroll.trackLine", {
              wordIndex: lineEl.dataset.word,
              word: lineEl.textContent,
            });
            lastMarkedWordRef.current = wordKey;
            trackCarryRef.current = 0;
          }

          const centered = isReadingLineCentered(lineEl, el);
          if (!centered) {
            const before = el.scrollTop;
            const target = computeReadingLineTargetScrollTop(lineEl, el, root);
            const result = applySmoothScrollTowardTarget(
              el.scrollTop,
              trackCarryRef.current,
              target,
              deltaSec,
            );
            trackCarryRef.current = result.carryPx;
            el.scrollTop = result.scrollTop;
            const ratio = lineCenterRatio(lineEl, el);

            syncLogThrottled("scroll.track", 750, "scroll.track.tick", {
              wordIndex: lineEl.dataset.word,
              scrollTop: Math.round(el.scrollTop),
              targetScroll: Math.round(target),
              errorPx: Math.round(target - before),
              lineCenterRatio: Number(ratio.toFixed(3)),
              targetCenterRatio: READ_CENTER_RATIO,
              carryPx: Number(trackCarryRef.current.toFixed(2)),
              deltaMs: Math.round(deltaSec * 1000),
            });
          } else {
            syncLogThrottled("scroll.track", 1500, "scroll.track.settled", {
              wordIndex: lineEl.dataset.word,
              scrollTop: Math.round(el.scrollTop),
              lineCenterRatio: Number(lineCenterRatio(lineEl, el).toFixed(3)),
              targetCenterRatio: READ_CENTER_RATIO,
            });
          }
        } else {
          if (syncEngaged) {
            syncLogThrottled("scroll.awaitMatch", 2000, "scroll.syncAwaitMatch", {
              scrollTop: Math.round(el.scrollTop),
            });
          }
          lastMarkedWordRef.current = null;
          trackCarryRef.current = 0;
          const clampedSpeed = clampScrollSpeed(speedRef.current);
          const deltaPx = BASE_SCROLL_PX_PER_SEC * clampedSpeed * deltaSec;
          const maxScroll = el.scrollHeight - el.clientHeight;
          const result = applyScrollStep(el.scrollTop, leverCarryRef.current, deltaPx, maxScroll);
          leverCarryRef.current = result.carryPx;
          el.scrollTop = result.scrollTop;

          syncLogThrottled("scroll.lever", 1000, "scroll.lever.tick", {
            scrollTop: Math.round(el.scrollTop),
            maxScroll: Math.round(maxScroll),
            speed: clampedSpeed,
            deltaPx: Number(deltaPx.toFixed(2)),
          });
        }
      }

      lastTimeRef.current = time;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      syncLog("scroll.loop.stop");
      motionQuery?.removeEventListener("change", onMotionPreferenceChange);
      lastTimeRef.current = null;
      leverCarryRef.current = 0;
      trackCarryRef.current = 0;
      lastMarkedWordRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [viewportRef, scriptRootRef, isPlaying, syncEngaged]);
}
