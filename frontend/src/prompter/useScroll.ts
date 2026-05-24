import { useEffect, useRef, type RefObject } from "react";

import { prefersReducedMotion } from "./motion";

/** Baseline scroll rate at 1× speed (pixels per second). */
export const BASE_SCROLL_PX_PER_SEC = 48;

export const SPEED_MIN = 0.1;
export const SPEED_MAX = 3;
/** Speed slider step — also used when rounding adaptive effective speed upward. */
export const SPEED_STEP = 0.1;

export type UseScrollOptions = {
  isPlaying: boolean;
  /** Multiplier 0.1–3× from settings. */
  speed: number;
  /**
   * Optional per-frame rate multiplier for adaptive sync.
   * `null` or omitted → 1× baseline. `0` → pause scroll for this frame.
   */
  resolveRate?: (ctx: ScrollFrameContext) => number | null;
};

export type ScrollFrameContext = {
  scrollTop: number;
  viewportHeight: number;
  maxScroll: number;
  reducedMotion: boolean;
};

export function clampScrollSpeed(speed: number): number {
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed));
}

/**
 * Applies an adaptive rule multiplier then rounds **up** to one decimal place
 * (0.1× steps).  E.g. 0.1× at +30 % → 0.13 → 0.2×; 0.7× at +50 % → 1.05 → 1.1×.
 */
export function applySpeedMultiplierRoundedUp(
  speed: number,
  multiplier: number,
): number {
  const raw = clampScrollSpeed(speed) * multiplier;
  const stepped = Math.ceil((raw - 1e-9) / SPEED_STEP) * SPEED_STEP;
  return clampScrollSpeed(stepped);
}

/**
 * Applies one scroll step, retaining fractional pixels in carryPx.
 * Browsers use integer scrollTop; without carry, low speeds (e.g. 0.1×) stall.
 */
export function applyScrollStep(
  scrollTop: number,
  carryPx: number,
  deltaPx: number,
  maxScroll: number,
): { scrollTop: number; carryPx: number } {
  let carry = carryPx + deltaPx;
  let next = scrollTop;

  if (maxScroll <= 0) {
    return { scrollTop: next, carryPx: carry };
  }

  const step = Math.floor(carry);
  if (step > 0) {
    next = Math.min(next + step, maxScroll);
    carry -= step;
    if (next >= maxScroll) {
      carry = 0;
    }
  }

  return { scrollTop: next, carryPx: carry };
}

/**
 * Drives vertical auto-scroll on a viewport element while playing.
 * Stops at the bottom; does not loop.
 */
export function useScroll(
  viewportRef: RefObject<HTMLElement | null>,
  { isPlaying, speed, resolveRate }: UseScrollOptions,
): void {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const carryRef = useRef(0);
  const resolveRateRef = useRef(resolveRate);
  const speedRef = useRef(speed);

  resolveRateRef.current = resolveRate;
  speedRef.current = speed;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isPlaying) {
      lastTimeRef.current = null;
      carryRef.current = 0;
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

    const tick = (time: number) => {
      const el = viewportRef.current;
      if (!el) {
        return;
      }

      if (reducedMotion) {
        lastTimeRef.current = time;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (lastTimeRef.current !== null) {
        const deltaSec = (time - lastTimeRef.current) / 1000;
        const clampedSpeed = clampScrollSpeed(speedRef.current);
        const maxScroll = el.scrollHeight - el.clientHeight;
        const rate =
          resolveRateRef.current?.({
            scrollTop: el.scrollTop,
            viewportHeight: el.clientHeight,
            maxScroll,
            reducedMotion,
          }) ?? 1;
        const effectiveSpeed =
          rate > 0 ? applySpeedMultiplierRoundedUp(clampedSpeed, rate) : 0;
        const deltaPx =
          effectiveSpeed > 0 ? BASE_SCROLL_PX_PER_SEC * effectiveSpeed * deltaSec : 0;
        const result = applyScrollStep(el.scrollTop, carryRef.current, deltaPx, maxScroll);
        carryRef.current = result.carryPx;
        el.scrollTop = result.scrollTop;
      }

      lastTimeRef.current = time;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      motionQuery?.removeEventListener("change", onMotionPreferenceChange);
      lastTimeRef.current = null;
      carryRef.current = 0;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [viewportRef, isPlaying]);
}

/** Exported for unit tests — scroll delta for one frame at given speed. */
export function scrollDeltaPx(deltaMs: number, speed: number): number {
  const clampedSpeed = clampScrollSpeed(speed);
  return BASE_SCROLL_PX_PER_SEC * clampedSpeed * (deltaMs / 1000);
}

/** Simulates scroll carry over many frames (tests low-speed reliability). */
export function simulateScrollPx(
  totalMs: number,
  frameMs: number,
  speed: number,
): number {
  let scrollTop = 0;
  let carry = 0;
  const frames = Math.floor(totalMs / frameMs);

  for (let i = 0; i < frames; i += 1) {
    const deltaPx = scrollDeltaPx(frameMs, speed);
    const maxScroll = Number.MAX_SAFE_INTEGER;
    const result = applyScrollStep(scrollTop, carry, deltaPx, maxScroll);
    scrollTop = result.scrollTop;
    carry = result.carryPx;
  }

  return scrollTop;
}
