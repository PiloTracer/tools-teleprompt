/**
 * DOM-based source-line position measurement for the adaptive teleprompter.
 *
 * The renderers (`markdown/render.ts`, `markdown/plain.ts`) tag every
 * rendered block / line element with one of:
 *   - `data-line-start` / `data-line-end` (0-based, inclusive — markdown
 *     blocks may span multiple source lines)
 *   - `data-line-index` (0-based, exact — one element per source line in
 *     the plain-text path)
 *
 * `measureLineOffsets` walks those elements, reads each one's actual
 * `getBoundingClientRect()` position relative to the scroll container, and
 * returns a `number[]` keyed by source-line index where each entry is the
 * Y offset (px) of that line's TOP edge inside the scrollable content.
 *
 * Why this exists:
 *   The previous adaptive code computed `lineOffsets[i] = i * lineHeightPx`
 *   from `fontSize * 1.5`.  That model ignores paragraph margins, content
 *   padding, CSS line-height (1.55 vs 1.5), and — most importantly — line
 *   wrap.  A long source line that wraps to three visual rows actually
 *   occupies ~3× the computed height, so the synthetic offsets drift
 *   further and further from the real DOM as you scroll down, breaking
 *   the "first or second visible line" geometry the user-facing rules
 *   depend on.  This module is the fix: measure what the browser actually
 *   renders, then feed those numbers to the resolver.
 */

const LINE_ELEMENT_SELECTOR = "[data-line-start], [data-line-index]";

export type LineOffsetsResult = {
  /** offsetTop (px, relative to scroll container's content) per source line. */
  offsets: number[];
  /** Total measurable content height (last line's bottom). */
  contentHeight: number;
  /** True when at least one tagged element was found. */
  measured: boolean;
};

/**
 * Compute `offsets[i]` = Y position of the TOP of source line `i` inside the
 * scrollable container, in CSS pixels.  Lines not directly tagged (e.g. blank
 * source lines between markdown paragraphs, or lines inside a multi-line
 * markdown block) are interpolated linearly between the surrounding tagged
 * elements.
 */
export function measureLineOffsets(
  scriptEl: HTMLElement | null,
  scrollEl: HTMLElement | null,
  lineCount: number,
): LineOffsetsResult {
  const empty: LineOffsetsResult = { offsets: [], contentHeight: 0, measured: false };
  if (!scriptEl || !scrollEl || lineCount <= 0) {
    return empty;
  }

  const elements = scriptEl.querySelectorAll<HTMLElement>(LINE_ELEMENT_SELECTOR);
  if (elements.length === 0) {
    return empty;
  }

  const scrollRect = scrollEl.getBoundingClientRect();
  // Convert viewport-relative `rect.top` into content-coordinate Y.
  const yOf = (rect: DOMRect) => rect.top - scrollRect.top + scrollEl.scrollTop;

  type Anchor = { line: number; y: number };
  const anchors: Anchor[] = [];
  let maxBottomY = 0;

  for (const el of Array.from(elements)) {
    const startAttr = el.getAttribute("data-line-start") ?? el.getAttribute("data-line-index");
    if (!startAttr) continue;
    const start = Number.parseInt(startAttr, 10);
    if (!Number.isFinite(start)) continue;

    const endAttr =
      el.getAttribute("data-line-end") ?? el.getAttribute("data-line-index") ?? startAttr;
    const end = Number.parseInt(endAttr, 10);
    const lastLine = Number.isFinite(end) ? Math.max(start, end) : start;

    const rect = el.getBoundingClientRect();
    const topY = yOf(rect);
    const bottomY = topY + rect.height;
    maxBottomY = Math.max(maxBottomY, bottomY);

    const span = lastLine - start;
    if (span <= 0) {
      anchors.push({ line: start, y: topY });
    } else {
      // Distribute lines evenly across the block's measured height.
      // For wrapped paragraphs this is approximate (line wrap may not be
      // uniform) but it's close enough for top/bottom-edge detection.
      for (let i = 0; i <= span; i += 1) {
        anchors.push({ line: start + i, y: topY + (i / (span + 1)) * rect.height });
      }
    }
  }

  if (anchors.length === 0) {
    return empty;
  }

  anchors.sort((a, b) => a.line - b.line || a.y - b.y);

  const offsets: number[] = new Array(lineCount);
  let anchorIdx = 0;

  for (let line = 0; line < lineCount; line += 1) {
    while (anchorIdx + 1 < anchors.length && anchors[anchorIdx + 1].line <= line) {
      anchorIdx += 1;
    }
    const curr = anchors[anchorIdx];
    const next = anchors[anchorIdx + 1];

    if (curr.line === line || !next) {
      offsets[line] = curr.y;
    } else if (line < curr.line) {
      offsets[line] = curr.y;
    } else {
      // Interpolate between consecutive anchors.
      const span = next.line - curr.line;
      const ratio = span === 0 ? 0 : (line - curr.line) / span;
      offsets[line] = curr.y + ratio * (next.y - curr.y);
    }
  }

  return { offsets, contentHeight: maxBottomY, measured: true };
}
