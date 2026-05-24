/** WCAG 2.x relative luminance and contrast (for token pair audits). */

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const int = Number.parseInt(value, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function channelLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channelLinear(r) + 0.7152 * channelLinear(g) + 0.0722 * channelLinear(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastPair = {
  name: string;
  foreground: string;
  background: string;
  minRatio: number;
};

export function assertContrastPairs(pairs: ContrastPair[]): Array<{
  name: string;
  ratio: number;
  minRatio: number;
  pass: boolean;
}> {
  return pairs.map((pair) => {
    const ratio = contrastRatio(pair.foreground, pair.background);
    return {
      name: pair.name,
      ratio: Math.round(ratio * 100) / 100,
      minRatio: pair.minRatio,
      pass: ratio >= pair.minRatio,
    };
  });
}
