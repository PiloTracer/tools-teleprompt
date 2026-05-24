import { describe, expect, it } from "vitest";

import {
  computeScrollTailPx,
  formatBottomClearancePx,
  formatViewportGridRows,
} from "../src/prompter/playerLayout";

describe("computeScrollTailPx", () => {
  it("returns zero when viewport or percent is zero", () => {
    expect(computeScrollTailPx(0, 50)).toBe(0);
    expect(computeScrollTailPx(400, 0)).toBe(0);
  });

  it("scales tail height to viewport height", () => {
    expect(computeScrollTailPx(500, 20)).toBe(100);
    expect(computeScrollTailPx(500, 100)).toBe(500);
  });
});

describe("formatBottomClearancePx", () => {
  it("returns px length from measured viewport height", () => {
    expect(formatBottomClearancePx(500, 20)).toBe("100px");
    expect(formatBottomClearancePx(0, 100)).toBe("0px");
  });
});

describe("formatViewportGridRows", () => {
  it("reserves a fixed bottom grid row from viewport percent", () => {
    expect(formatViewportGridRows(500, 20)).toBe("minmax(0, 1fr) 100px");
    expect(formatViewportGridRows(500, 0)).toBe("minmax(0, 1fr) 0px");
  });
});
