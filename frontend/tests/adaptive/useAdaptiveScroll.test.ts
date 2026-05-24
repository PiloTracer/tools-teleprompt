import { describe, expect, it } from "vitest";

import {
  applySpeedMultiplierRoundedUp,
  BASE_SCROLL_PX_PER_SEC,
  scrollDeltaPx,
} from "../../src/prompter/useScroll";
import {
  BOTTOM_BOOST_MAX,
  estimateReadingLineFromViewport,
  pickEffectiveReadingLine,
  READ_BOTTOM_BOOST_MIN,
  READ_TOP_EXIT_CUSHION,
  READ_TOP_SLOWDOWN_MAX,
  TOP_SLOWDOWN_FACTOR,
  minSpokenLineRatioNearIndex,
  resolveAdaptiveScrollRate,
  shouldApplyBottomBoost,
  shouldApplyTopSlowdown,
  simulateAdaptiveScrollPx,
} from "../../src/prompter/adaptive/useAdaptiveScroll";
import type { ParsedScriptLine } from "../../src/prompter/adaptive/types";

// ---------------------------------------------------------------------------
// resolveAdaptiveScrollRate — the 4 binding rules.
// ---------------------------------------------------------------------------
describe("resolveAdaptiveScrollRate — gating", () => {
  const base = {
    adaptiveEnabled: true,
    micSyncEngaged: true,
    reducedMotion: false,
    readLineRatio: 0.5 as number | null,
  };

  it("returns null when adaptive is off", () => {
    expect(resolveAdaptiveScrollRate({ ...base, adaptiveEnabled: false })).toBeNull();
  });

  it("returns null when mic sync is off", () => {
    expect(resolveAdaptiveScrollRate({ ...base, micSyncEngaged: false })).toBeNull();
  });

  it("returns null under reduced motion", () => {
    expect(resolveAdaptiveScrollRate({ ...base, reducedMotion: true })).toBeNull();
  });
});

describe("resolveAdaptiveScrollRate — Rule 1 (top 30 % → ×0.5 soft brake)", () => {
  const base = {
    adaptiveEnabled: true,
    micSyncEngaged: true,
    reducedMotion: false,
    readLineRatio: null as number | null,
  };

  it("halves speed at the very top of the viewport", () => {
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: 0 })).toBe(
      TOP_SLOWDOWN_FACTOR,
    );
  });

  it("halves speed at exactly the 30 % threshold", () => {
    expect(
      resolveAdaptiveScrollRate({ ...base, readLineRatio: READ_TOP_SLOWDOWN_MAX }),
    ).toBe(TOP_SLOWDOWN_FACTOR);
  });

  it("halves speed just inside the top band", () => {
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: 0.1 })).toBe(
      TOP_SLOWDOWN_FACTOR,
    );
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: 0.29 })).toBe(
      TOP_SLOWDOWN_FACTOR,
    );
  });

  it("TOP_SLOWDOWN_FACTOR is exactly −50 %", () => {
    expect(TOP_SLOWDOWN_FACTOR).toBe(0.5);
  });

  it("halves speed when SR is in the middle but viewport top line is in the exit band", () => {
    expect(
      resolveAdaptiveScrollRate({
        ...base,
        readLineRatio: 0.5,
        viewportMinSpokenRatio: 0.12,
      }),
    ).toBe(TOP_SLOWDOWN_FACTOR);
  });

  it("halves speed when SR line just crossed above the viewport (negative ratio)", () => {
    expect(
      resolveAdaptiveScrollRate({
        ...base,
        readLineRatio: -0.05,
      }),
    ).toBe(TOP_SLOWDOWN_FACTOR);
  });
});

describe("resolveAdaptiveScrollRate — Rule 2 (middle band → 1×)", () => {
  const base = {
    adaptiveEnabled: true,
    micSyncEngaged: true,
    reducedMotion: false,
    readLineRatio: null as number | null,
  };

  it("scrolls at user speed just past the top band", () => {
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: 0.31 })).toBe(1);
  });

  it("scrolls at user speed in the centre", () => {
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: 0.5 })).toBe(1);
  });

  it("scrolls at user speed just before the bottom band", () => {
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: 0.69 })).toBe(1);
  });

  it("does not slow down when SR is in the middle even if older lines sit in the top band", () => {
    expect(
      resolveAdaptiveScrollRate({
        ...base,
        readLineRatio: 0.5,
        viewportMinSpokenRatio: 0.5,
      }),
    ).toBe(1);
  });
});

describe("resolveAdaptiveScrollRate — Rule 3 (bottom 30 % → +30 %)", () => {
  const base = {
    adaptiveEnabled: true,
    micSyncEngaged: true,
    reducedMotion: false,
    readLineRatio: null as number | null,
  };

  it("boosts at exactly the 70 % threshold", () => {
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: READ_BOTTOM_BOOST_MIN })).toBe(
      BOTTOM_BOOST_MAX,
    );
  });

  it("boosts in the bottom band", () => {
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: 0.85 })).toBe(BOTTOM_BOOST_MAX);
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: 1 })).toBe(BOTTOM_BOOST_MAX);
  });

  it("BOTTOM_BOOST_MAX is exactly +30 %", () => {
    expect(BOTTOM_BOOST_MAX).toBe(1.3);
  });
});

describe("resolveAdaptiveScrollRate — Rule 4 (no signal → 1× normal)", () => {
  const base = {
    adaptiveEnabled: true,
    micSyncEngaged: true,
    reducedMotion: false,
  };

  it("continues at 1× when SR has never matched (null)", () => {
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: null })).toBe(1);
  });

  it("continues at 1× when the SR line is far off-screen above (stale cursor)", () => {
    // Common during meta cards: SR cursor stuck on the last spoken line above
    // the visible viewport.  Don't freeze — scroll through normally.
    expect(
      resolveAdaptiveScrollRate({ ...base, readLineRatio: -READ_TOP_EXIT_CUSHION - 0.1 }),
    ).toBe(1);
  });

  it("continues at 1× when the SR line is off-screen BELOW (ratio > 1)", () => {
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: 1.5 })).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// simulateAdaptiveScrollPx — end-to-end frame replay against known offsets
// ---------------------------------------------------------------------------
describe("simulateAdaptiveScrollPx", () => {
  // Synthetic 30-line script, each line 36 px tall, no wrap → linear offsets.
  // These are the kind of pre-measured offsets the real hook receives from
  // measureLineOffsets at runtime.
  const LINE_HEIGHT = 36;
  const LINE_COUNT = 30;
  const VIEWPORT = 800;
  const LINE_OFFSETS = Array.from({ length: LINE_COUNT }, (_, i) => i * LINE_HEIGHT);

  it("Rule 1 — halves speed when reading line sits in the top band", () => {
    // Park the reading line so ratio starts at 0.20 (mid of top-30% band) and
    // stays inside the band for the whole window: at 0.5× over 500 ms the
    // scroll only advances ~12 px, so end-of-window ratio is still ~0.185.
    const totalMs = 500;
    const readingLine = 12;
    const lineTopY = LINE_OFFSETS[readingLine];
    const initialScrollTop = lineTopY - VIEWPORT * 0.20;
    const delta = simulateAdaptiveScrollPx({
      totalMs,
      frameMs: 16.67,
      speed: 1,
      lineOffsets: LINE_OFFSETS,
      initialScrollTop,
      viewportHeight: VIEWPORT,
      readingLineIndex: readingLine,
      syncActive: true,
      adaptiveEnabled: true,
    });
    const baseline = scrollDeltaPx(totalMs, 1);
    expect(delta).toBeGreaterThan(0);
    // Allow ±20 % wiggle around the 0.5× target to absorb integer carry.
    expect(delta).toBeGreaterThanOrEqual(Math.floor(baseline * 0.4));
    expect(delta).toBeLessThanOrEqual(Math.ceil(baseline * 0.6));
  });

  it("Rule 2 — scrolls at ~1× while reading line is in the centre", () => {
    // Position scroll so reading line ~mid viewport.
    const readingLine = 12;
    const lineTopY = LINE_OFFSETS[readingLine];
    const initialScrollTop = lineTopY - VIEWPORT * 0.5; // line top at ratio 0.5
    const delta = simulateAdaptiveScrollPx({
      totalMs: 1000,
      frameMs: 16.67,
      speed: 1,
      lineOffsets: LINE_OFFSETS,
      initialScrollTop,
      viewportHeight: VIEWPORT,
      readingLineIndex: readingLine,
      syncActive: true,
      adaptiveEnabled: true,
    });
    // Should be close to a normal 1× scroll over 1 s.
    const baseline = scrollDeltaPx(1000, 1);
    expect(delta).toBeGreaterThan(baseline * 0.3);
    expect(delta).toBeLessThan(baseline * 1.3);
  });

  it("Rule 3 — boosts ~1.3× when reading line is in the bottom band", () => {
    const readingLine = 12;
    const lineTopY = LINE_OFFSETS[readingLine];
    const initialScrollTop = lineTopY - VIEWPORT * 0.8; // line top at ratio 0.8
    const delta = simulateAdaptiveScrollPx({
      totalMs: 500,
      frameMs: 16.67,
      speed: 1,
      lineOffsets: LINE_OFFSETS,
      initialScrollTop,
      viewportHeight: VIEWPORT,
      readingLineIndex: readingLine,
      syncActive: true,
      adaptiveEnabled: true,
    });
    const baseline = scrollDeltaPx(500, 1);
    expect(delta).toBeGreaterThanOrEqual(Math.floor(baseline * 1.15));
    expect(delta).toBeLessThanOrEqual(Math.ceil(baseline * 1.45));
  });

  it("Rule 4 — scroll delta matches ~1× baseline when SR has no line lock", () => {
    const totalMs = 500;
    const delta = simulateAdaptiveScrollPx({
      totalMs,
      frameMs: 16.67,
      speed: 1,
      lineOffsets: LINE_OFFSETS,
      initialScrollTop: 5 * LINE_HEIGHT,
      viewportHeight: VIEWPORT,
      readingLineIndex: null,
      syncActive: true,
      adaptiveEnabled: true,
    });
    const baseline = scrollDeltaPx(totalMs, 1);
    expect(delta).toBeGreaterThanOrEqual(Math.floor(baseline * 0.85));
    expect(delta).toBeLessThanOrEqual(Math.ceil(baseline * 1.15));
  });

  it("Rule 4 — continues at 1× when SR has NO line lock", () => {
    const delta = simulateAdaptiveScrollPx({
      totalMs: 500,
      frameMs: 16.67,
      speed: 1,
      lineOffsets: LINE_OFFSETS,
      initialScrollTop: 5 * LINE_HEIGHT,
      viewportHeight: VIEWPORT,
      readingLineIndex: null,
      syncActive: true,
      adaptiveEnabled: true,
    });
    expect(delta).toBeGreaterThan(0);
  });

  it("Rule 4 — continues at 1× when SR line is off-screen above (stale cursor)", () => {
    // Reading line is at y=0; scroll is way past it → ratio is strongly negative.
    const delta = simulateAdaptiveScrollPx({
      totalMs: 500,
      frameMs: 16.67,
      speed: 1,
      lineOffsets: LINE_OFFSETS,
      initialScrollTop: 20 * LINE_HEIGHT,
      viewportHeight: VIEWPORT,
      readingLineIndex: 0,
      syncActive: true,
      adaptiveEnabled: true,
    });
    expect(delta).toBeGreaterThan(0);
  });

  it("sync off — fixed 1× baseline (adaptive resolver returns null)", () => {
    const delta = simulateAdaptiveScrollPx({
      totalMs: 400,
      frameMs: 16.67,
      speed: 1,
      lineOffsets: LINE_OFFSETS,
      initialScrollTop: 0,
      viewportHeight: VIEWPORT,
      readingLineIndex: null,
      syncActive: false,
      adaptiveEnabled: true,
    });
    expect(delta).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Baseline constant — keep adaptive scroll math consistent with useScroll
// ---------------------------------------------------------------------------
describe("minSpokenLineRatioNearIndex", () => {
  const spoken = (text: string, index: number): ParsedScriptLine => ({
    index,
    kind: "spoken",
    text,
  });
  const meta = (text: string, index: number): ParsedScriptLine => ({
    index,
    kind: "meta",
    text,
  });

  it("ignores meta lines and returns the topmost visible spoken ratio near the cursor", () => {
    const offsets = [100, 200, 250];
    const lines = [spoken("a", 0), meta("stage", 1), spoken("c", 2)];
    const scrollTop = 200;
    const ratio = minSpokenLineRatioNearIndex(offsets, scrollTop, 500, lines, 2);
    expect(ratio).toBeCloseTo((250 - scrollTop) / 500, 5);
  });

  it("does not include lines far above the SR cursor", () => {
    const offsets = [0, 400, 500];
    const lines = offsets.map((_, index) => spoken(`line ${index}`, index));
    const scrollTop = 0;
    const nearCursor = minSpokenLineRatioNearIndex(offsets, scrollTop, 500, lines, 2, 1, 0);
    expect(nearCursor).toBeCloseTo(0.8, 5);
    const unscopedMin = (0 - scrollTop) / 500;
    expect(unscopedMin).toBe(0);
    expect(nearCursor).toBeGreaterThan(unscopedMin);
  });
});

describe("shouldApplyTopSlowdown", () => {
  it("fires on viewport fallback without SR ratio", () => {
    expect(
      shouldApplyTopSlowdown({
        adaptiveEnabled: true,
        micSyncEngaged: true,
        reducedMotion: false,
        readLineRatio: null,
        viewportMinSpokenRatio: 0.2,
      }),
    ).toBe(true);
  });
});

describe("pickEffectiveReadingLine", () => {
  it("prefers viewport estimate when SR line is far below the visible area", () => {
    const viewport = { index: 8, ratio: 0.22, source: "viewport" as const };
    const picked = pickEffectiveReadingLine(315, 15.6, viewport);
    expect(picked).toEqual(viewport);
  });

  it("keeps SR when it is in the bottom band even if viewport center disagrees", () => {
    const viewport = { index: 5, ratio: 0.45, source: "viewport" as const };
    const picked = pickEffectiveReadingLine(12, 0.82, viewport);
    expect(picked).toEqual({ index: 12, ratio: 0.82, source: "sr" });
  });
});

describe("estimateReadingLineFromViewport", () => {
  const spoken = (text: string, index: number): ParsedScriptLine => ({
    index,
    kind: "spoken",
    text,
  });

  it("picks the visible spoken line closest to the read-zone center", () => {
    const offsets = [0, 200, 400, 600];
    const lines = offsets.map((_, i) => spoken(`l${i}`, i));
    const scrollTop = 0;
    const vh = 1000;
    const est = estimateReadingLineFromViewport(offsets, scrollTop, vh, lines);
    expect(est?.index).toBe(2);
    expect(est?.ratio).toBeCloseTo(0.4, 5);
  });
});

describe("shouldApplyBottomBoost", () => {
  const base = {
    adaptiveEnabled: true,
    micSyncEngaged: true,
    reducedMotion: false,
    readLineRatio: 0.5 as number | null,
  };

  it("boosts when a nearby visible line sits in the bottom band", () => {
    expect(
      shouldApplyBottomBoost({
        ...base,
        readLineRatio: 0.5,
        viewportMaxSpokenRatio: 0.75,
      }),
    ).toBe(true);
  });
});

describe("applySpeedMultiplierRoundedUp", () => {
  it("rounds up to one decimal after +30 %", () => {
    expect(applySpeedMultiplierRoundedUp(0.1, 1.3)).toBe(0.2);
  });

  it("rounds up to one decimal after +50 %", () => {
    expect(applySpeedMultiplierRoundedUp(0.7, 1.5)).toBe(1.1);
  });

  it("rounds up to one decimal after −50 %", () => {
    expect(applySpeedMultiplierRoundedUp(0.1, 0.5)).toBe(0.1);
  });

  it("leaves an exact stepped speed unchanged", () => {
    expect(applySpeedMultiplierRoundedUp(1, 1.3)).toBe(1.3);
  });
});

describe("baseline constants", () => {
  it("scrollDeltaPx matches useScroll BASE_SCROLL_PX_PER_SEC for 1× speed", () => {
    expect(scrollDeltaPx(1000, 1)).toBe(BASE_SCROLL_PX_PER_SEC);
  });
});
