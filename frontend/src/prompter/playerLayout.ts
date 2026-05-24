/** Base content padding-bottom from CSS (must stay in sync with `.tp-player-content`). */
export const PLAYER_CONTENT_PADDING_BASE_REM = 1;

/** Bottom clearance in px from measured player viewport height and slider percent. */
export function computeScrollTailPx(
  viewportHeight: number,
  bottomPaddingPercent: number,
): number {
  if (viewportHeight <= 0 || bottomPaddingPercent <= 0) {
    return 0;
  }
  return Math.round((bottomPaddingPercent / 100) * viewportHeight);
}

/** CSS length for the reserved bottom band inside the player viewport. */
export function formatBottomClearancePx(
  viewportHeight: number,
  bottomPaddingPercent: number,
): string {
  return `${computeScrollTailPx(viewportHeight, bottomPaddingPercent)}px`;
}

/** CSS grid rows for viewport frame: scroll area + fixed bottom band. */
export function formatViewportGridRows(
  viewportHeight: number,
  bottomPaddingPercent: number,
): string {
  const clearancePx = computeScrollTailPx(viewportHeight, bottomPaddingPercent);
  return `minmax(0, 1fr) ${clearancePx}px`;
}
