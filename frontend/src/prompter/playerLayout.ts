/** Empty scroll tail so lines can sit above the footer (near an overhead camera). */
export function computeScrollTailPx(
  viewportHeight: number,
  bottomPaddingPercent: number,
): number {
  if (viewportHeight <= 0 || bottomPaddingPercent <= 0) {
    return 0;
  }
  return Math.round((bottomPaddingPercent / 100) * viewportHeight);
}
