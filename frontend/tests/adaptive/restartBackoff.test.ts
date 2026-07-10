import { describe, expect, it } from "vitest";

import {
  BASE_RESTART_DELAY_MS,
  computeRestartDelayMs,
  MAX_RESTART_BACKOFF_MS,
} from "../../src/prompter/adaptive/restartBackoff";

describe("computeRestartDelayMs", () => {
  it("uses the base delay when nothing is silent-looping yet", () => {
    expect(computeRestartDelayMs(0)).toBe(BASE_RESTART_DELAY_MS);
    expect(computeRestartDelayMs(-1)).toBe(BASE_RESTART_DELAY_MS);
  });

  it("backs off exponentially per consecutive silent restart", () => {
    expect(computeRestartDelayMs(1)).toBe(BASE_RESTART_DELAY_MS * 2);
    expect(computeRestartDelayMs(2)).toBe(BASE_RESTART_DELAY_MS * 4);
    expect(computeRestartDelayMs(3)).toBe(BASE_RESTART_DELAY_MS * 8);
  });

  it("caps the backoff at MAX_RESTART_BACKOFF_MS", () => {
    expect(computeRestartDelayMs(10)).toBe(MAX_RESTART_BACKOFF_MS);
    expect(computeRestartDelayMs(100)).toBe(MAX_RESTART_BACKOFF_MS);
  });
});
