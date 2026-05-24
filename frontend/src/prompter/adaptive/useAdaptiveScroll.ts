import { useCallback, useMemo, type RefObject } from "react";

import { parseScriptLines } from "./parseScriptLines";
import type { LineKind } from "./types";
import { useScroll, type ScrollFrameContext } from "../useScroll";

/** Read zone band from viewport top (amendment 01). */
export const READ_ZONE_MIN = 0.35;
export const READ_ZONE_MAX = 0.48;
export const READ_ZONE_CENTER = 0.42;

/** Meta line skim multiplier (amendment 01 R14). */
export const META_SCROLL_MULTIPLIER = 2;

/** Uniform line height estimate: fontSize × ratio (assumption for line-index map). */
export const LINE_HEIGHT_RATIO = 1.5;

export type AdaptiveScrollInput = {
  adaptiveEnabled: boolean;
  syncActive: boolean;
  reducedMotion: boolean;
  inMeta: boolean;
  vadSpeaking: boolean;
  readLineRatio: number;
  /** When false, silence uses baseline scroll until first VAD speech this sync session. */
  silencePauseEnabled: boolean;
};

/** Build cumulative line-top offsets for a uniform line-height layout. */
export function buildLineOffsets(lineCount: number, lineHeightPx: number): number[] {
  const offsets: number[] = [];
  for (let i = 0; i < lineCount; i += 1) {
    offsets.push(i * lineHeightPx);
  }
  return offsets;
}

/** Viewport-relative center position of a line (0 = top, 1 = bottom). */
export function readLineCenterRatio(
  lineIndex: number,
  lineOffsets: number[],
  lineHeightPx: number,
  scrollTop: number,
  viewportHeight: number,
): number {
  if (viewportHeight <= 0) {
    return 0;
  }
  const lineTop = lineOffsets[lineIndex] ?? 0;
  const centerY = lineTop + lineHeightPx / 2 - scrollTop;
  return centerY / viewportHeight;
}

/** Line whose center is nearest the read zone anchor (amendment R8b). */
export function estimateReadLineIndex(
  lineOffsets: number[],
  lineHeightPx: number,
  scrollTop: number,
  viewportHeight: number,
  centerRatio = READ_ZONE_CENTER,
): number {
  if (lineOffsets.length === 0 || viewportHeight <= 0) {
    return 0;
  }
  const targetY = viewportHeight * centerRatio;
  let bestIndex = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < lineOffsets.length; i += 1) {
    const centerY = lineOffsets[i] + lineHeightPx / 2 - scrollTop;
    const dist = Math.abs(centerY - targetY);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return bestIndex;
}

export function isInReadZone(ratio: number): boolean {
  return ratio >= READ_ZONE_MIN && ratio <= READ_ZONE_MAX;
}

/**
 * Adaptive scroll rate multiplier while sync is active.
 * Returns `null` when fixed baseline scroll should apply (adaptive off / sync off).
 */
export function resolveAdaptiveScrollRate(input: AdaptiveScrollInput): number | null {
  const { adaptiveEnabled, syncActive, reducedMotion, inMeta, vadSpeaking, readLineRatio, silencePauseEnabled } =
    input;

  if (!adaptiveEnabled || !syncActive || reducedMotion) {
    return null;
  }
  if (inMeta) {
    return META_SCROLL_MULTIPLIER;
  }
  if (!vadSpeaking) {
    return silencePauseEnabled ? 0 : null;
  }
  // Line above the read zone (too high on screen) — scroll forward until it enters the band.
  if (readLineRatio < READ_ZONE_MIN) {
    return 1;
  }
  // At the top edge of the band, hold position (line would scroll out upward).
  if (readLineRatio <= READ_ZONE_MIN) {
    return 0;
  }
  return 1;
}

export type UseAdaptiveScrollOptions = {
  viewportRef: RefObject<HTMLElement | null>;
  source: string;
  isPlaying: boolean;
  speed: number;
  fontSizePx: number;
  adaptiveEnabled: boolean;
  syncActive: boolean;
  vadSpeaking: boolean;
  silencePauseEnabled: boolean;
};

/**
 * Composes adaptive VAD/meta/read-zone rates with the baseline scroll driver (SPEC R8–R9, R14–R15).
 */
export function useAdaptiveScroll({
  viewportRef,
  source,
  isPlaying,
  speed,
  fontSizePx,
  adaptiveEnabled,
  syncActive,
  vadSpeaking,
  silencePauseEnabled,
}: UseAdaptiveScrollOptions): void {
  const parsedLines = useMemo(() => parseScriptLines(source), [source]);
  const lineKinds = useMemo(
    () => parsedLines.map((line) => line.kind),
    [parsedLines],
  );
  const lineHeightPx = fontSizePx * LINE_HEIGHT_RATIO;
  const lineOffsets = useMemo(
    () => buildLineOffsets(parsedLines.length, lineHeightPx),
    [parsedLines.length, lineHeightPx],
  );

  const resolveRate = useCallback(
    (ctx: ScrollFrameContext) => {
      const readIndex = estimateReadLineIndex(
        lineOffsets,
        lineHeightPx,
        ctx.scrollTop,
        ctx.viewportHeight,
      );
      const inMeta = lineKinds[readIndex] === "meta";
      const readLineRatio = readLineCenterRatio(
        readIndex,
        lineOffsets,
        lineHeightPx,
        ctx.scrollTop,
        ctx.viewportHeight,
      );
      const rate = resolveAdaptiveScrollRate({
        adaptiveEnabled,
        syncActive,
        reducedMotion: ctx.reducedMotion,
        inMeta,
        vadSpeaking,
        readLineRatio,
        silencePauseEnabled,
      });
      return rate;
    },
    [
      adaptiveEnabled,
      syncActive,
      vadSpeaking,
      silencePauseEnabled,
      lineKinds,
      lineHeightPx,
      lineOffsets,
    ],
  );

  useScroll(viewportRef, {
    isPlaying,
    speed,
    resolveRate: adaptiveEnabled ? resolveRate : undefined,
  });
}

/** Test helper — simulate adaptive scroll frames with uniform line layout. */
export function simulateAdaptiveScrollPx(options: {
  totalMs: number;
  frameMs: number;
  speed: number;
  lineCount: number;
  lineHeightPx: number;
  initialScrollTop: number;
  viewportHeight: number;
  vadSpeaking: boolean;
  syncActive: boolean;
  adaptiveEnabled: boolean;
  lineKinds: LineKind[];
  silencePauseEnabled?: boolean;
}): number {
  const {
    totalMs,
    frameMs,
    speed,
    lineCount,
    lineHeightPx,
    initialScrollTop,
    viewportHeight,
    vadSpeaking,
    syncActive,
    adaptiveEnabled,
    lineKinds,
    silencePauseEnabled = false,
  } = options;

  const lineOffsets = buildLineOffsets(lineCount, lineHeightPx);
  let scrollTop = initialScrollTop;
  let carry = 0;
  const frames = Math.floor(totalMs / frameMs);

  for (let i = 0; i < frames; i += 1) {
    const readIndex = estimateReadLineIndex(
      lineOffsets,
      lineHeightPx,
      scrollTop,
      viewportHeight,
    );
    const inMeta = lineKinds[readIndex] === "meta";
    const readLineRatio = readLineCenterRatio(
      readIndex,
      lineOffsets,
      lineHeightPx,
      scrollTop,
      viewportHeight,
    );
    const rate = resolveAdaptiveScrollRate({
      adaptiveEnabled,
      syncActive,
      reducedMotion: false,
      inMeta,
      vadSpeaking,
      readLineRatio,
      silencePauseEnabled,
    });
    const multiplier = rate ?? 1;
    const deltaPx =
      (48 * Math.min(3, Math.max(0.5, speed)) * (frameMs / 1000)) * multiplier;
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

/** Test helper — read line ratio after simulated scroll. */
export function readLineRatioAfterScroll(options: {
  scrollTop: number;
  lineCount: number;
  lineHeightPx: number;
  viewportHeight: number;
}): number {
  const lineOffsets = buildLineOffsets(options.lineCount, options.lineHeightPx);
  const readIndex = estimateReadLineIndex(
    lineOffsets,
    options.lineHeightPx,
    options.scrollTop,
    options.viewportHeight,
  );
  return readLineCenterRatio(
    readIndex,
    lineOffsets,
    options.lineHeightPx,
    options.scrollTop,
    options.viewportHeight,
  );
}
