import { describe, expect, it } from "vitest";

import { prefersReducedMotion } from "../src/prompter/motion";

describe("prefersReducedMotion", () => {
  it("returns false when reduced motion is not preferred", () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});
