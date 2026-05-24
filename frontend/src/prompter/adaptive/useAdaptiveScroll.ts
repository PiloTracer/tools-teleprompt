import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";

import { measureLineOffsets } from "./measureLineOffsets";
import { parseScriptLines } from "./parseScriptLines";
import type { ParsedScriptLine } from "./types";
import {
  applySpeedMultiplierRoundedUp,
  clampScrollSpeed,
  useScroll,
  type ScrollFrameContext,
} from "../useScroll";

// ─── Rule thresholds (user spec — 4 rules, viewport-relative) ────────────────

/**
 * Top-edge slowdown band: scroll runs at half speed while the reading line's
 * TOP edge sits in the upper 30 % of the viewport.  This is a soft brake
 * (not a full stop) so the rule still produces visible behaviour when SR is
 * a beat behind the reader; the line continues to drift slowly past the top
 * rather than locking the viewport in place.
 */
export const READ_TOP_SLOWDOWN_MAX = 0.30;

/**
 * SR line tops slightly above the viewport (negative ratio) still count as
 * "exiting at the top" for Rule 1.  Ratios below this are treated as a stale
 * cursor (e.g. meta cards) and fall through to Rule 4 at 1×.
 */
export const READ_TOP_EXIT_CUSHION = 0.15;

/** Speed multiplier applied while reading in the top band (Rule 1: −50 %). */
export const TOP_SLOWDOWN_FACTOR = 0.5;

/**
 * Bottom-edge boost band: scroll speeds up by 30 % while the reading line's
 * TOP edge sits in the lower 30 % of the viewport (i.e. ratio ≥ 0.70).
 */
export const READ_BOTTOM_BOOST_MIN = 0.70;

/** Speed multiplier applied while reading in the bottom band (Rule 3: +30 %). */
export const BOTTOM_BOOST_MAX = 1.3;

/**
 * @deprecated kept as an alias for the older `READ_TOP_STOP_MAX` constant so
 * external imports do not break; new code should reference
 * `READ_TOP_SLOWDOWN_MAX` since the top band no longer fully stops scroll.
 */
export const READ_TOP_STOP_MAX = READ_TOP_SLOWDOWN_MAX;

/** Target anchor for scroll-based reading-line estimate (upper-middle viewport). */
export const READ_ZONE_CENTER_RATIO = 0.42;

/** When SR and viewport estimates differ more than this, trust the viewport. */
export const SR_VIEWPORT_DISAGREE_THRESHOLD = 0.35;

export type EffectiveReadingLine = {
  index: number;
  ratio: number;
  source: "sr" | "viewport";
};

// ─── Public API ──────────────────────────────────────────────────────────────

export type AdaptiveScrollInput = {
  adaptiveEnabled: boolean;
  micSyncEngaged: boolean;
  reducedMotion: boolean;

  /**
   * Viewport-relative Y ratio (0 = viewport top, 1 = viewport bottom) of the
   * TOP edge of the source line currently being read.
   *
   *   - `null`                → no SR signal at all (cold start, denied mic,
   *                             unsupported browser).  Rule 4: continue at 1×.
   *   - `< -READ_TOP_EXIT_CUSHION` or `> 1` → SR cursor far off-screen (meta
   *                             card with stale lock).  Rule 4: continue at 1×
   *                             unless viewport fallback triggers Rule 1.
   *   - `(-cushion, 0]`       → line just crossed the top edge; Rule 1 brake.
   *   - `0 ≤ ratio ≤ 1`       → SR-reported reading line is visible — apply
   *                             position rules 1 / 2 / 3.
   *
   * The hook computes this from DOM-measured line offsets, so it reflects
   * what is ACTUALLY rendered (wrap, paragraph margins, content padding),
   * not the synthetic `i * lineHeight` approximation used previously.
   */
  readLineRatio: number | null;
  /**
   * Minimum viewport ratio among spoken lines with tops currently visible
   * (or just above the viewport).  Catches the exit band when SR locks onto a
   * line further down the script.
   */
  viewportMinSpokenRatio?: number | null;
  /** Highest top-edge ratio among spoken lines near the effective reading line. */
  viewportMaxSpokenRatio?: number | null;
};

// ─── Viewport geometry helpers ───────────────────────────────────────────────

export function lineViewportRatio(
  lineTopY: number,
  scrollTop: number,
  viewportHeight: number,
): number {
  if (viewportHeight <= 0) {
    return 0;
  }
  return (lineTopY - scrollTop) / viewportHeight;
}

/** Lines before/after the SR cursor considered for viewport Rule 1 fallback. */
export const VIEWPORT_FALLBACK_BACKWARD = 4;
export const VIEWPORT_FALLBACK_FORWARD = 2;

/**
 * Smallest top-edge ratio among spoken lines near `centerIndex` whose tops are
 * in or just above the viewport.  Scoped to the SR cursor so older lines still
 * visible at the top do not keep Rule 1 engaged while reading in the middle.
 */
export function minSpokenLineRatioNearIndex(
  offsets: number[],
  scrollTop: number,
  viewportHeight: number,
  parsedLines: ParsedScriptLine[],
  centerIndex: number,
  backward = VIEWPORT_FALLBACK_BACKWARD,
  forward = VIEWPORT_FALLBACK_FORWARD,
): number | null {
  if (viewportHeight <= 0 || offsets.length === 0) {
    return null;
  }

  const start = Math.max(0, centerIndex - backward);
  const end = Math.min(offsets.length - 1, centerIndex + forward);

  let minRatio: number | null = null;
  for (let i = start; i <= end; i += 1) {
    if (parsedLines[i]?.kind !== "spoken") {
      continue;
    }
    const ratio = lineViewportRatio(offsets[i]!, scrollTop, viewportHeight);
    if (ratio > 1 || ratio < -READ_TOP_EXIT_CUSHION) {
      continue;
    }
    if (minRatio === null || ratio < minRatio) {
      minRatio = ratio;
    }
  }
  return minRatio;
}

/**
 * Spoken line in the viewport whose top is closest to the read-zone center.
 * Used when SR is silent or locked on an off-screen line (common with long scripts).
 */
export function estimateReadingLineFromViewport(
  offsets: number[],
  scrollTop: number,
  viewportHeight: number,
  parsedLines: ParsedScriptLine[],
): EffectiveReadingLine | null {
  if (viewportHeight <= 0 || offsets.length === 0) {
    return null;
  }

  let best: EffectiveReadingLine | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < offsets.length; i += 1) {
    if (parsedLines[i]?.kind !== "spoken") {
      continue;
    }
    const ratio = lineViewportRatio(offsets[i]!, scrollTop, viewportHeight);
    if (ratio > 1.05 || ratio < -READ_TOP_EXIT_CUSHION) {
      continue;
    }
    const dist = Math.abs(ratio - READ_ZONE_CENTER_RATIO);
    if (dist < bestDist) {
      bestDist = dist;
      best = { index: i, ratio, source: "viewport" };
    }
  }
  return best;
}

export function isSrRatioPlausible(ratio: number | null): boolean {
  return (
    ratio !== null &&
    ratio >= -READ_TOP_EXIT_CUSHION &&
    ratio <= 1
  );
}

/**
 * Prefer SR when it matches what is on screen; otherwise use the viewport estimate.
 */
export function pickEffectiveReadingLine(
  srIndex: number | null,
  srRatio: number | null,
  viewportEstimate: EffectiveReadingLine | null,
): EffectiveReadingLine | null {
  if (srIndex === null || srRatio === null) {
    return viewportEstimate;
  }

  if (!isSrRatioPlausible(srRatio)) {
    return viewportEstimate ?? { index: srIndex, ratio: srRatio, source: "sr" };
  }

  // Trust SR in the top / bottom rule bands — only override in the middle when
  // SR clearly disagrees with what is visible (e.g. matcher jumped to line 315).
  if (srRatio <= READ_TOP_SLOWDOWN_MAX || srRatio >= READ_BOTTOM_BOOST_MIN) {
    return { index: srIndex, ratio: srRatio, source: "sr" };
  }

  if (
    viewportEstimate &&
    Math.abs(srRatio - viewportEstimate.ratio) > SR_VIEWPORT_DISAGREE_THRESHOLD
  ) {
    return viewportEstimate;
  }

  return { index: srIndex, ratio: srRatio, source: "sr" };
}

export function maxSpokenLineRatioNearIndex(
  offsets: number[],
  scrollTop: number,
  viewportHeight: number,
  parsedLines: ParsedScriptLine[],
  centerIndex: number,
  backward = VIEWPORT_FALLBACK_BACKWARD,
  forward = VIEWPORT_FALLBACK_FORWARD,
): number | null {
  if (viewportHeight <= 0 || offsets.length === 0) {
    return null;
  }

  const start = Math.max(0, centerIndex - backward);
  const end = Math.min(offsets.length - 1, centerIndex + forward);

  let maxRatio: number | null = null;
  for (let i = start; i <= end; i += 1) {
    if (parsedLines[i]?.kind !== "spoken") {
      continue;
    }
    const ratio = lineViewportRatio(offsets[i]!, scrollTop, viewportHeight);
    if (ratio > 1.05 || ratio < -READ_TOP_EXIT_CUSHION) {
      continue;
    }
    if (maxRatio === null || ratio > maxRatio) {
      maxRatio = ratio;
    }
  }
  return maxRatio;
}

/** @deprecated Use {@link minSpokenLineRatioNearIndex} — unscoped scan breaks Rule 2. */
export function minVisibleSpokenLineRatio(
  offsets: number[],
  scrollTop: number,
  viewportHeight: number,
  parsedLines: ParsedScriptLine[],
): number | null {
  if (offsets.length === 0) {
    return null;
  }
  return minSpokenLineRatioNearIndex(
    offsets,
    scrollTop,
    viewportHeight,
    parsedLines,
    0,
    offsets.length,
    0,
  );
}

/** True when Rule 1 (top exit band) should halve scroll speed. */
export function shouldApplyTopSlowdown(input: AdaptiveScrollInput): boolean {
  const { readLineRatio, viewportMinSpokenRatio } = input;

  if (
    readLineRatio !== null &&
    readLineRatio >= -READ_TOP_EXIT_CUSHION &&
    readLineRatio <= READ_TOP_SLOWDOWN_MAX
  ) {
    return true;
  }

  return (
    viewportMinSpokenRatio != null &&
    viewportMinSpokenRatio <= READ_TOP_SLOWDOWN_MAX
  );
}

/** True when Rule 3 (bottom 30 % band) should boost scroll speed by 30 %. */
export function shouldApplyBottomBoost(input: AdaptiveScrollInput): boolean {
  const { readLineRatio, viewportMaxSpokenRatio } = input;
  if (readLineRatio !== null && readLineRatio >= READ_BOTTOM_BOOST_MIN) {
    return true;
  }
  return (
    viewportMaxSpokenRatio != null &&
    viewportMaxSpokenRatio >= READ_BOTTOM_BOOST_MIN
  );
}

// ─── Core rate resolver ──────────────────────────────────────────────────────

/**
 * Resolves the per-frame scroll multiplier for adaptive sync.
 *
 * Returns:
 *   `null` → adaptive off / sync off / reduced motion; `useScroll` falls back
 *            to its fixed 1× baseline.  Any other number is a multiplier
 *            applied on top of the user-selected speed.
 *
 * Rules (user spec — 4 rules, viewport-relative bands):
 *   1. Reading top    30 %  → ×0.5  (−50 %, soft brake — line still drifts)
 *   2. Reading middle band  → 1×    (user-selected speed unchanged)
 *   3. Reading bottom 30 %  → ×1.3  (+30 %)
 *   4. Not reading at all   → 1×    (continue at the user-selected speed)
 *
 * Implementation note:
 *   "Not reading at all" maps to `readLineRatio === null` OR a ratio outside
 *   the visible viewport (negative or > 1).  The latter handles the common
 *   case where a meta card scrolls into view but SR's last match is still
 *   the previous spoken line above the viewport.
 */
export function resolveAdaptiveScrollRate(input: AdaptiveScrollInput): number | null {
  const { adaptiveEnabled, micSyncEngaged, reducedMotion, readLineRatio } = input;

  if (!adaptiveEnabled || reducedMotion || !micSyncEngaged) {
    return null;
  }

  // Rule 1 — top exit band (SR line, just-exited line, or any visible spoken line).
  if (shouldApplyTopSlowdown(input)) {
    return TOP_SLOWDOWN_FACTOR;
  }

  // Rule 4 — no in-band reading signal → scroll at the user-set speed.
  if (
    readLineRatio === null ||
    readLineRatio < -READ_TOP_EXIT_CUSHION ||
    readLineRatio > 1
  ) {
    return 1;
  }

  // Rule 3 — bottom 30 % of viewport: +30 %.
  if (shouldApplyBottomBoost(input)) {
    return BOTTOM_BOOST_MAX;
  }

  // Rule 2 — middle band: user-selected speed unchanged.
  return 1;
}

// ─── React hook ──────────────────────────────────────────────────────────────

export type UseAdaptiveScrollOptions = {
  /** Outer scroll container (also queried for `[data-line-*]` descendants). */
  viewportRef: RefObject<HTMLElement | null>;
  source: string;
  isPlaying: boolean;
  speed: number;
  fontSizePx: number;
  adaptiveEnabled: boolean;
  micSyncEngaged: boolean;
  /** From SpeechRecognition — null when SR has no recent line match. */
  readingLineIndex: number | null;
};

/**
 * Drive adaptive scroll based on the user's 4-rule spec.
 *
 * Measures actual rendered line positions from the DOM (via
 * `measureLineOffsets`) so the position rules respond to what the reader
 * sees, not to a synthetic `i * fontSize * 1.5` model.  Offsets are
 * recomputed when the source, font size, or viewport size changes; the
 * scroll-driven `readLineRatio` is then derived from the live `scrollTop`
 * every frame.
 */
export function useAdaptiveScroll({
  viewportRef,
  source,
  isPlaying,
  speed,
  fontSizePx,
  adaptiveEnabled,
  micSyncEngaged,
  readingLineIndex,
}: UseAdaptiveScrollOptions): void {
  const readingLineIndexRef = useRef(readingLineIndex);
  const micSyncRef = useRef(micSyncEngaged);
  const adaptiveRef = useRef(adaptiveEnabled);
  readingLineIndexRef.current = readingLineIndex;
  micSyncRef.current = micSyncEngaged;
  adaptiveRef.current = adaptiveEnabled;

  const parsedLines = useMemo(() => parseScriptLines(source), [source]);
  const parsedLinesRef = useRef(parsedLines);
  parsedLinesRef.current = parsedLines;
  const lineCount = parsedLines.length;

  // DOM-measured line offsets (px from top of scroll content) per source line.
  // Updated on source / font / viewport changes; consumed by the rAF resolver.
  const offsetsRef = useRef<number[]>([]);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      offsetsRef.current = [];
      return;
    }
    const scriptEl = viewport.querySelector<HTMLElement>(".tp-player-script") ?? viewport;
    const result = measureLineOffsets(scriptEl, viewport, lineCount);
    offsetsRef.current = result.measured ? result.offsets : [];
    console.log("[adaptive] measured line offsets", {
      lineCount,
      measured: result.measured,
      offsetCount: result.offsets.length,
      contentHeight: Math.round(result.contentHeight),
      firstFew: result.offsets.slice(0, 5).map((y) => Math.round(y)),
      taggedElements: scriptEl.querySelectorAll("[data-line-start], [data-line-index]").length,
    });
  }, [viewportRef, lineCount]);

  // After every layout that could change line positions, re-measure.
  useLayoutEffect(() => {
    measure();
  }, [measure, source, fontSizePx, adaptiveEnabled]);

  // Re-measure on viewport size changes (wrap depends on width).
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [viewportRef, measure]);

  const lastLogRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const resolveRate = useCallback(
    (ctx: ScrollFrameContext) => {
      const offsets = offsetsRef.current;
      const srIndex = readingLineIndexRef.current;
      const parsedLines = parsedLinesRef.current;

      let srRatio: number | null = null;
      if (
        srIndex !== null &&
        srIndex >= 0 &&
        srIndex < offsets.length &&
        ctx.viewportHeight > 0
      ) {
        srRatio = lineViewportRatio(offsets[srIndex]!, ctx.scrollTop, ctx.viewportHeight);
      }

      const viewportEstimate =
        offsets.length > 0
          ? estimateReadingLineFromViewport(
              offsets,
              ctx.scrollTop,
              ctx.viewportHeight,
              parsedLines,
            )
          : null;

      // Rule 4 — no SR reading signal: do not infer position from the viewport.
      const effective =
        srIndex === null
          ? null
          : pickEffectiveReadingLine(srIndex, srRatio, viewportEstimate);
      const effectiveIndex = effective?.index ?? null;
      const readLineRatio = effective?.ratio ?? null;

      const viewportMinSpokenRatio =
        effectiveIndex !== null && offsets.length > 0
          ? minSpokenLineRatioNearIndex(
              offsets,
              ctx.scrollTop,
              ctx.viewportHeight,
              parsedLines,
              effectiveIndex,
              VIEWPORT_FALLBACK_BACKWARD,
              0,
            )
          : null;

      const viewportMaxSpokenRatio =
        effectiveIndex !== null && offsets.length > 0
          ? maxSpokenLineRatioNearIndex(
              offsets,
              ctx.scrollTop,
              ctx.viewportHeight,
              parsedLines,
              effectiveIndex,
            )
          : null;

      const rate = resolveAdaptiveScrollRate({
        adaptiveEnabled: adaptiveRef.current,
        micSyncEngaged: micSyncRef.current,
        reducedMotion: ctx.reducedMotion,
        readLineRatio,
        viewportMinSpokenRatio,
        viewportMaxSpokenRatio,
      });

      const now = performance.now();
      if (now - lastLogRef.current > 500 && adaptiveRef.current && micSyncRef.current) {
        lastLogRef.current = now;
        const clamped = clampScrollSpeed(speedRef.current);
        const effectiveSpeed =
          rate !== null && rate > 0
            ? applySpeedMultiplierRoundedUp(clamped, rate)
            : clamped;
        console.log("[adaptive]", {
          rate,
          effectiveSpeed,
          readLineRatio: readLineRatio === null ? null : Number(readLineRatio.toFixed(3)),
          srLineRatio: srRatio === null ? null : Number(srRatio.toFixed(3)),
          lineSource: effective?.source ?? null,
          viewportMinSpokenRatio:
            viewportMinSpokenRatio === null
              ? null
              : Number(viewportMinSpokenRatio.toFixed(3)),
          viewportMaxSpokenRatio:
            viewportMaxSpokenRatio === null
              ? null
              : Number(viewportMaxSpokenRatio.toFixed(3)),
          readingLine: effectiveIndex,
          srLine: srIndex,
          offsetsMeasured: offsets.length,
          scrollTop: Math.round(ctx.scrollTop),
          viewportHeight: Math.round(ctx.viewportHeight),
        });
      }

      return rate;
    },
    [],
  );

  useScroll(viewportRef, {
    isPlaying,
    speed,
    resolveRate: adaptiveEnabled ? resolveRate : undefined,
  });
}

// ─── Simulation helper (for tests) ───────────────────────────────────────────

/**
 * Pure simulator: replays the adaptive resolver against a sequence of
 * frames with a static reading-line index and a known DOM-offset table.
 * Used by vitest to validate the 4 rules without a real DOM.
 */
export function simulateAdaptiveScrollPx(options: {
  totalMs: number;
  frameMs: number;
  speed: number;
  /** Pre-computed `offsets[i]` = top-Y (px) of source line `i` in content. */
  lineOffsets: number[];
  initialScrollTop: number;
  viewportHeight: number;
  /** SR-reported line index (null = no SR signal → Rule 4). */
  readingLineIndex: number | null;
  syncActive: boolean;
  adaptiveEnabled: boolean;
}): number {
  const {
    totalMs,
    frameMs,
    speed,
    lineOffsets,
    initialScrollTop,
    viewportHeight,
    readingLineIndex,
    syncActive,
    adaptiveEnabled,
  } = options;

  let scrollTop = initialScrollTop;
  let carry = 0;
  const frames = Math.floor(totalMs / frameMs);

  const spokenLines = lineOffsets.map((_, index) => ({
    index,
    text: "",
    kind: "spoken" as const,
  }));

  for (let i = 0; i < frames; i += 1) {
    let srRatio: number | null = null;
    if (
      readingLineIndex !== null &&
      readingLineIndex >= 0 &&
      readingLineIndex < lineOffsets.length &&
      viewportHeight > 0
    ) {
      srRatio = lineViewportRatio(lineOffsets[readingLineIndex]!, scrollTop, viewportHeight);
    }

    const viewportEstimate =
      lineOffsets.length > 0
        ? estimateReadingLineFromViewport(
            lineOffsets,
            scrollTop,
            viewportHeight,
            spokenLines,
          )
        : null;

    const effective =
      readingLineIndex === null
        ? null
        : pickEffectiveReadingLine(readingLineIndex, srRatio, viewportEstimate);
    const effectiveIndex = effective?.index ?? null;
    const readLineRatio = effective?.ratio ?? null;

    let viewportMinSpokenRatio: number | null = null;
    let viewportMaxSpokenRatio: number | null = null;
    if (effectiveIndex !== null && viewportHeight > 0) {
      viewportMinSpokenRatio = minSpokenLineRatioNearIndex(
        lineOffsets,
        scrollTop,
        viewportHeight,
        spokenLines,
        effectiveIndex,
        VIEWPORT_FALLBACK_BACKWARD,
        0,
      );
      viewportMaxSpokenRatio = maxSpokenLineRatioNearIndex(
        lineOffsets,
        scrollTop,
        viewportHeight,
        spokenLines,
        effectiveIndex,
      );
    }

    const rate = resolveAdaptiveScrollRate({
      adaptiveEnabled,
      micSyncEngaged: syncActive,
      reducedMotion: false,
      readLineRatio,
      viewportMinSpokenRatio,
      viewportMaxSpokenRatio,
    });

    const multiplier = rate ?? 1;
    const effectiveSpeed = applySpeedMultiplierRoundedUp(speed, multiplier);
    const deltaPx = 48 * effectiveSpeed * (frameMs / 1000);
    if (deltaPx <= 0) {
      continue;
    }
    carry += deltaPx;
    const step = Math.floor(carry);
    if (step > 0) {
      scrollTop += step;
      carry -= step;
    }
  }

  return scrollTop - initialScrollTop;
}
