/** Viewport-relative reading line (0 = top, 1 = bottom). */
export const READ_CENTER_RATIO = 0.5;

/** Stop micro-adjustments when the read line is within this band of the target ratio. */
export const SCROLL_CENTER_TOLERANCE_RATIO = 0.055;

/** Seconds to reach ~63% of target error for scroll position (steady tracking). */
export const SCROLL_TRACK_RESPONSE_SEC = 0.28;

/** Slower easing when correcting a large vertical offset (reposition after skip-ahead). */
export const SCROLL_TRACK_LARGE_ERROR_RESPONSE_SEC = 0.36;

/** Pixel error above which large-offset easing applies. */
export const SCROLL_TRACK_LARGE_ERROR_PX = 160;

/** Max scroll correction speed (px/s). */
export const SCROLL_TRACK_MAX_PX_PER_SEC = 400;

/** Pixels — words on the same visual row within this tolerance. */
export const READING_LINE_ROW_TOLERANCE_PX = 6;

/** Compute scrollTop that vertically centers an element in the viewport. */
export function computeTargetScrollTop(
  anchorEl: HTMLElement,
  viewport: HTMLElement,
  centerRatio = READ_CENTER_RATIO,
): number {
  const viewportRect = viewport.getBoundingClientRect();
  const anchorRect = anchorEl.getBoundingClientRect();
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const targetCenterY = viewportRect.top + viewportRect.height * centerRatio;
  return viewport.scrollTop + (anchorCenterY - targetCenterY);
}

/** Collect word spans that share the same visual row as `wordEl`. */
export function getReadingLineWordElements(
  wordEl: HTMLElement,
  scriptRoot: HTMLElement,
): HTMLElement[] {
  const rowTop = wordEl.getBoundingClientRect().top;
  const words = scriptRoot.querySelectorAll<HTMLElement>(".tp-word");
  const row: HTMLElement[] = [];

  for (const candidate of words) {
    if (Math.abs(candidate.getBoundingClientRect().top - rowTop) <= READING_LINE_ROW_TOLERANCE_PX) {
      row.push(candidate);
    }
  }

  return row.length > 0 ? row : [wordEl];
}

function readingLineCenterY(lineWords: HTMLElement[]): number {
  let minTop = Infinity;
  let maxBottom = -Infinity;
  for (const el of lineWords) {
    const rect = el.getBoundingClientRect();
    minTop = Math.min(minTop, rect.top);
    maxBottom = Math.max(maxBottom, rect.bottom);
  }
  return (minTop + maxBottom) / 2;
}

/** Target scrollTop from a known set of line word elements (no full-script scan). */
export function computeReadingLineTargetScrollFromElements(
  lineWords: HTMLElement[],
  viewport: HTMLElement,
  centerRatio = READ_CENTER_RATIO,
): number {
  if (lineWords.length === 0) {
    return viewport.scrollTop;
  }
  const lineCenterY = readingLineCenterY(lineWords);
  const viewportRect = viewport.getBoundingClientRect();
  const targetCenterY = viewportRect.top + viewportRect.height * centerRatio;
  return viewport.scrollTop + (lineCenterY - targetCenterY);
}

/**
 * Word index of the `.tp-word` whose vertical center is closest to the
 * viewport's read-zone band — i.e. where the user is currently reading.
 *
 * Returns null when no annotated words intersect the viewport (script not
 * yet annotated, or scrolled fully off-screen).
 */
export function findViewportAnchorWordIndex(
  viewport: HTMLElement,
  scriptRoot: HTMLElement,
  centerRatio = READ_CENTER_RATIO,
): number | null {
  const viewportRect = viewport.getBoundingClientRect();
  if (viewportRect.height <= 0) {
    return null;
  }
  const targetY = viewportRect.top + viewportRect.height * centerRatio;
  const words = scriptRoot.querySelectorAll<HTMLElement>(".tp-word");
  if (words.length === 0) {
    return null;
  }

  let bestIndex: number | null = null;
  let bestDistance = Infinity;

  for (const el of words) {
    const rect = el.getBoundingClientRect();
    if (rect.bottom < viewportRect.top || rect.top > viewportRect.bottom) {
      continue;
    }
    const center = rect.top + rect.height / 2;
    const distance = Math.abs(center - targetY);
    if (distance < bestDistance) {
      bestDistance = distance;
      const raw = Number(el.dataset.word);
      if (Number.isFinite(raw)) {
        bestIndex = raw;
      }
    }
  }

  return bestIndex;
}

/** Target scrollTop to center the full visual line containing `wordEl`. */
export function computeReadingLineTargetScrollTop(
  wordEl: HTMLElement,
  viewport: HTMLElement,
  scriptRoot: HTMLElement,
  centerRatio = READ_CENTER_RATIO,
): number {
  const lineWords = getReadingLineWordElements(wordEl, scriptRoot);
  return computeReadingLineTargetScrollFromElements(lineWords, viewport, centerRatio);
}

/** True when the read line is already on the target band (no scroll needed). */
export function isReadingLineCenteredFromElements(
  lineWords: HTMLElement[],
  viewport: HTMLElement,
  centerRatio = READ_CENTER_RATIO,
  tolerance = SCROLL_CENTER_TOLERANCE_RATIO,
): boolean {
  const viewportRect = viewport.getBoundingClientRect();
  if (viewportRect.height <= 0 || lineWords.length === 0) {
    return true;
  }
  const centerY = readingLineCenterY(lineWords);
  const ratio = (centerY - viewportRect.top) / viewportRect.height;
  return Math.abs(ratio - centerRatio) <= tolerance;
}

/** True when a single word's center sits on the target band. */
export function isReadingLineCentered(
  wordEl: HTMLElement,
  viewport: HTMLElement,
  centerRatio = READ_CENTER_RATIO,
  tolerance = SCROLL_CENTER_TOLERANCE_RATIO,
): boolean {
  return isReadingLineCenteredFromElements([wordEl], viewport, centerRatio, tolerance);
}

/**
 * Time-based exponential smoothing toward target scroll (frame-rate independent).
 * Retains fractional carry so motion stays smooth at low speeds.
 */
export function applySmoothScrollTowardTarget(
  scrollTop: number,
  carryPx: number,
  targetScrollTop: number,
  deltaSec: number,
  responseSec = SCROLL_TRACK_RESPONSE_SEC,
  maxPxPerSec = SCROLL_TRACK_MAX_PX_PER_SEC,
): { scrollTop: number; carryPx: number } {
  if (deltaSec <= 0) {
    return { scrollTop, carryPx };
  }

  const error = targetScrollTop - scrollTop;
  const alpha = 1 - Math.exp(-deltaSec / responseSec);
  let motion = error * alpha + carryPx;

  if (Math.abs(error) < 0.02 && Math.abs(motion) < 0.02) {
    return { scrollTop, carryPx: 0 };
  }

  const maxStep = Math.max(0.5, maxPxPerSec * deltaSec);
  if (Math.abs(motion) > maxStep) {
    motion = Math.sign(motion) * maxStep;
  }

  const step = Math.trunc(motion);
  motion -= step;

  return { scrollTop: scrollTop + step, carryPx: motion };
}

/** @deprecated Use applySmoothScrollTowardTarget. */
export function applyProportionalScrollStep(
  currentScrollTop: number,
  targetScrollTop: number,
  deadZonePx = 0,
  gain = 0.15,
): number {
  const error = targetScrollTop - currentScrollTop;
  if (Math.abs(error) <= deadZonePx) {
    return currentScrollTop;
  }
  return currentScrollTop + error * gain;
}

/** @deprecated */
export const SCROLL_DEAD_ZONE_PX = 0;
/** @deprecated */
export const SCROLL_CORRECTION_GAIN = 0.15;
