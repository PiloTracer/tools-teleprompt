import { describe, expect, it } from "vitest";

import {
  BASE_SCROLL_PX_PER_SEC,
  scrollDeltaPx,
} from "../../src/prompter/useScroll";
import {
  META_SCROLL_MULTIPLIER,
  READ_ZONE_CENTER,
  READ_ZONE_MIN,
  buildLineOffsets,
  estimateReadLineIndex,
  isInReadZone,
  readLineCenterRatio,
  readLineRatioAfterScroll,
  resolveAdaptiveScrollRate,
  simulateAdaptiveScrollPx,
} from "../../src/prompter/adaptive/useAdaptiveScroll";

const LINE_HEIGHT = 36;
const VIEWPORT = 800;

function scrollTopForLineAtCenter(lineIndex: number, lineHeightPx = LINE_HEIGHT): number {
  const lineTop = lineIndex * lineHeightPx;
  return lineTop + lineHeightPx / 2 - VIEWPORT * READ_ZONE_CENTER;
}

describe("resolveAdaptiveScrollRate", () => {
  const base = {
    adaptiveEnabled: true,
    syncActive: true,
    reducedMotion: false,
    inMeta: false,
    vadSpeaking: true,
    readLineRatio: READ_ZONE_CENTER,
  };

  it("returns null when adaptive is off (R9 fixed speed)", () => {
    expect(resolveAdaptiveScrollRate({ ...base, adaptiveEnabled: false })).toBeNull();
  });

  it("returns null when sync is inactive (R5, R9)", () => {
    expect(resolveAdaptiveScrollRate({ ...base, syncActive: false })).toBeNull();
  });

  it("pauses spoken lines on silence (R8)", () => {
    expect(
      resolveAdaptiveScrollRate({ ...base, vadSpeaking: false, readLineRatio: 0.4 }),
    ).toBe(0);
  });

  it("scrolls spoken lines at baseline while VAD on and in band (R8)", () => {
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: 0.4 })).toBe(1);
  });

  it("scrolls when read line is above the read zone (R8)", () => {
    expect(resolveAdaptiveScrollRate({ ...base, readLineRatio: 0.1 })).toBe(1);
  });

  it("pauses spoken scroll when read line reaches top of band", () => {
    expect(
      resolveAdaptiveScrollRate({ ...base, readLineRatio: READ_ZONE_MIN }),
    ).toBe(0);
  });

  it("skims meta at 2× regardless of VAD (R14–R15)", () => {
    expect(
      resolveAdaptiveScrollRate({
        ...base,
        inMeta: true,
        vadSpeaking: false,
        readLineRatio: 0.2,
      }),
    ).toBe(META_SCROLL_MULTIPLIER);
  });
});

describe("read zone helpers", () => {
  it("estimates read line nearest viewport center", () => {
    const offsets = buildLineOffsets(10, LINE_HEIGHT);
    const scrollTop = scrollTopForLineAtCenter(3);
    expect(estimateReadLineIndex(offsets, LINE_HEIGHT, scrollTop, VIEWPORT)).toBe(3);
  });

  it("detects read zone band membership (35–48%)", () => {
    expect(isInReadZone(0.42)).toBe(true);
    expect(isInReadZone(0.35)).toBe(true);
    expect(isInReadZone(0.48)).toBe(true);
    expect(isInReadZone(0.34)).toBe(false);
    expect(isInReadZone(0.49)).toBe(false);
  });

  it("computes read line center ratio from scroll position", () => {
    const offsets = buildLineOffsets(5, LINE_HEIGHT);
    const scrollTop = scrollTopForLineAtCenter(2);
    const ratio = readLineCenterRatio(2, offsets, LINE_HEIGHT, scrollTop, VIEWPORT);
    expect(ratio).toBeCloseTo(READ_ZONE_CENTER, 2);
  });
});

describe("simulateAdaptiveScrollPx", () => {
  it("uses baseline delta while VAD on and sync active (R8)", () => {
    const delta = simulateAdaptiveScrollPx({
      totalMs: 1000,
      frameMs: 16.67,
      speed: 1,
      lineCount: 20,
      lineHeightPx: LINE_HEIGHT,
      initialScrollTop: scrollTopForLineAtCenter(2),
      viewportHeight: VIEWPORT,
      vadSpeaking: true,
      syncActive: true,
      adaptiveEnabled: true,
      lineKinds: Array.from({ length: 20 }, () => "spoken" as const),
    });
    const expected = scrollDeltaPx(1000, 1);
    expect(delta).toBeGreaterThanOrEqual(expected - 5);
    expect(delta).toBeLessThanOrEqual(expected + 5);
  });

  it("does not scroll on silence while sync active (R8)", () => {
    const delta = simulateAdaptiveScrollPx({
      totalMs: 1000,
      frameMs: 16.67,
      speed: 1,
      lineCount: 20,
      lineHeightPx: LINE_HEIGHT,
      initialScrollTop: scrollTopForLineAtCenter(2),
      viewportHeight: VIEWPORT,
      vadSpeaking: false,
      syncActive: true,
      adaptiveEnabled: true,
      lineKinds: Array.from({ length: 20 }, () => "spoken" as const),
    });
    expect(delta).toBe(0);
  });

  it("uses fixed baseline when sync inactive (R8c)", () => {
    const adaptiveOff = simulateAdaptiveScrollPx({
      totalMs: 500,
      frameMs: 16.67,
      speed: 1,
      lineCount: 10,
      lineHeightPx: LINE_HEIGHT,
      initialScrollTop: 0,
      viewportHeight: VIEWPORT,
      vadSpeaking: false,
      syncActive: false,
      adaptiveEnabled: true,
      lineKinds: Array.from({ length: 10 }, () => "spoken" as const),
    });
    expect(adaptiveOff).toBeGreaterThan(0);
  });

  it("scrolls meta at 2× baseline (R14)", () => {
    const spokenDelta = simulateAdaptiveScrollPx({
      totalMs: 1000,
      frameMs: 16.67,
      speed: 1,
      lineCount: 5,
      lineHeightPx: LINE_HEIGHT,
      initialScrollTop: scrollTopForLineAtCenter(1),
      viewportHeight: VIEWPORT,
      vadSpeaking: true,
      syncActive: true,
      adaptiveEnabled: true,
      lineKinds: ["spoken", "spoken", "spoken", "spoken", "spoken"],
    });
    const metaDelta = simulateAdaptiveScrollPx({
      totalMs: 1000,
      frameMs: 16.67,
      speed: 1,
      lineCount: 5,
      lineHeightPx: LINE_HEIGHT,
      initialScrollTop: scrollTopForLineAtCenter(1),
      viewportHeight: VIEWPORT,
      vadSpeaking: false,
      syncActive: true,
      adaptiveEnabled: true,
      lineKinds: ["spoken", "meta", "meta", "meta", "spoken"],
    });
    expect(metaDelta).toBeGreaterThan(spokenDelta * 1.5);
    expect(metaDelta).toBeLessThanOrEqual(spokenDelta * META_SCROLL_MULTIPLIER + 10);
  });

  it("keeps read line within band over short VAD-on burst (R8, R8b)", () => {
    const initialScrollTop = scrollTopForLineAtCenter(2);
    const scrollDelta = simulateAdaptiveScrollPx({
      totalMs: 200,
      frameMs: 16.67,
      speed: 1,
      lineCount: 20,
      lineHeightPx: LINE_HEIGHT,
      initialScrollTop,
      viewportHeight: VIEWPORT,
      vadSpeaking: true,
      syncActive: true,
      adaptiveEnabled: true,
      lineKinds: Array.from({ length: 20 }, () => "spoken" as const),
    });
    const ratio = readLineRatioAfterScroll({
      scrollTop: initialScrollTop + scrollDelta,
      lineCount: 20,
      lineHeightPx: LINE_HEIGHT,
      viewportHeight: VIEWPORT,
    });
    expect(isInReadZone(ratio)).toBe(true);
  });
});

describe("baseline constants", () => {
  it("matches useScroll baseline for 1× speed", () => {
    expect(scrollDeltaPx(1000, 1)).toBe(BASE_SCROLL_PX_PER_SEC);
  });
});
