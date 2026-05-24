import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  isSyncDebugEnabled,
  syncLog,
  syncLogOnChange,
  syncLogThrottled,
} from "../../src/prompter/adaptive/syncDebug";

describe("syncDebug", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("respects localStorage tp:debug=0", () => {
    localStorage.setItem("tp:debug", "0");
    expect(isSyncDebugEnabled()).toBe(false);
    syncLog("hidden");
    expect(console.log).not.toHaveBeenCalled();
  });

  it("forces logging when tp:debug=1", () => {
    localStorage.setItem("tp:debug", "1");
    syncLog("visible", { ok: true });
    expect(console.log).toHaveBeenCalled();
  });

  it("throttles repeated keys", () => {
    localStorage.setItem("tp:debug", "1");
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    syncLogThrottled("tick", 500, "first");
    now = 100;
    syncLogThrottled("tick", 500, "second");
    now = 600;
    syncLogThrottled("tick", 500, "third");

    expect(console.log).toHaveBeenCalledTimes(2);
  });

  it("logs only on value change", () => {
    localStorage.setItem("tp:debug", "1");
    syncLogOnChange("word", 1, "wordIndex");
    syncLogOnChange("word", 1, "wordIndex");
    syncLogOnChange("word", 2, "wordIndex");

    expect(console.log).toHaveBeenCalledTimes(2);
  });
});
