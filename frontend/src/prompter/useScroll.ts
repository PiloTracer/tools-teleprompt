import { useEffect, useRef, type RefObject } from "react";

/** Baseline scroll rate at 1× speed (pixels per second). */
export const BASE_SCROLL_PX_PER_SEC = 48;

export type UseScrollOptions = {
  isPlaying: boolean;
  /** Multiplier 0.5–3× from settings. */
  speed: number;
};

/**
 * Drives vertical auto-scroll on a viewport element while playing.
 * Stops at the bottom; does not loop.
 */
export function useScroll(
  viewportRef: RefObject<HTMLElement | null>,
  { isPlaying, speed }: UseScrollOptions,
): void {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isPlaying) {
      lastTimeRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = (time: number) => {
      const el = viewportRef.current;
      if (!el) {
        return;
      }

      if (lastTimeRef.current !== null) {
        const deltaSec = (time - lastTimeRef.current) / 1000;
        const clampedSpeed = Math.min(3, Math.max(0.5, speed));
        const deltaPx = BASE_SCROLL_PX_PER_SEC * clampedSpeed * deltaSec;
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll <= 0) {
          lastTimeRef.current = time;
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        el.scrollTop = Math.min(el.scrollTop + deltaPx, maxScroll);
      }

      lastTimeRef.current = time;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      lastTimeRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [viewportRef, isPlaying, speed]);
}

/** Exported for unit tests — scroll delta for one frame at given speed. */
export function scrollDeltaPx(deltaMs: number, speed: number): number {
  const clampedSpeed = Math.min(3, Math.max(0.5, speed));
  return BASE_SCROLL_PX_PER_SEC * clampedSpeed * (deltaMs / 1000);
}
