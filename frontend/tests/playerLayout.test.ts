import { describe, expect, it } from "vitest";

import { computeScrollTailPx } from "../src/prompter/playerLayout";

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
