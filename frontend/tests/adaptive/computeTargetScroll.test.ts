import { describe, expect, it } from "vitest";

import {
  applySmoothScrollTowardTarget,
  computeReadingLineTargetScrollTop,
  computeTargetScrollTop,
  getReadingLineWordElements,
  isReadingLineCentered,
  READ_CENTER_RATIO,
  SCROLL_TRACK_MAX_PX_PER_SEC,
} from "../../src/prompter/adaptive/computeTargetScroll";

describe("computeTargetScrollTop", () => {
  it("centers an anchor element in the viewport", () => {
    const viewport = {
      getBoundingClientRect: () => ({
        top: 100,
        height: 400,
        left: 0,
        right: 0,
        bottom: 500,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
      scrollTop: 200,
      clientHeight: 400,
    } as unknown as HTMLElement;

    const word = {
      getBoundingClientRect: () => ({
        top: 450,
        height: 20,
        left: 0,
        right: 0,
        bottom: 470,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    expect(computeTargetScrollTop(word, viewport)).toBe(360);
  });
});

describe("getReadingLineWordElements", () => {
  it("groups words on the same visual row", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <span class="tp-word" data-word="0">One</span>
      <span class="tp-word" data-word="1">two</span>
      <span class="tp-word" data-word="2" style="display:block;margin-top:40px">Next</span>
    `;

    const first = root.querySelector<HTMLElement>('[data-word="0"]')!;
    Object.defineProperty(first, "getBoundingClientRect", {
      value: () => ({ top: 100, bottom: 120, left: 0, right: 0, width: 0, height: 20, x: 0, y: 0, toJSON: () => ({}) }),
    });
    const second = root.querySelector<HTMLElement>('[data-word="1"]')!;
    Object.defineProperty(second, "getBoundingClientRect", {
      value: () => ({ top: 100, bottom: 120, left: 0, right: 0, width: 0, height: 20, x: 0, y: 0, toJSON: () => ({}) }),
    });
    const third = root.querySelector<HTMLElement>('[data-word="2"]')!;
    Object.defineProperty(third, "getBoundingClientRect", {
      value: () => ({ top: 160, bottom: 180, left: 0, right: 0, width: 0, height: 20, x: 0, y: 0, toJSON: () => ({}) }),
    });

    const row = getReadingLineWordElements(first, root);
    expect(row.map((el) => el.dataset.word)).toEqual(["0", "1"]);
  });
});

describe("computeReadingLineTargetScrollTop", () => {
  it("places the read line at the vertical middle", () => {
    const viewport = {
      getBoundingClientRect: () => ({
        top: 0,
        height: 400,
        left: 0,
        right: 0,
        bottom: 400,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
      scrollTop: 0,
      clientHeight: 400,
    } as unknown as HTMLElement;

    const root = document.createElement("div");
    const word = document.createElement("span");
    word.className = "tp-word";
    word.dataset.word = "0";
    root.appendChild(word);

    Object.defineProperty(word, "getBoundingClientRect", {
      value: () => ({
        top: 500,
        bottom: 520,
        left: 0,
        right: 0,
        width: 0,
        height: 20,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    expect(computeReadingLineTargetScrollTop(word, viewport, root)).toBe(310);
  });
});

describe("isReadingLineCentered", () => {
  it("returns true when the word sits on the target band", () => {
    const viewport = {
      getBoundingClientRect: () => ({
        top: 0,
        height: 400,
        left: 0,
        right: 0,
        bottom: 400,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    const word = {
      getBoundingClientRect: () => ({
        top: 190,
        bottom: 210,
        left: 0,
        right: 0,
        width: 0,
        height: 20,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    expect(isReadingLineCentered(word, viewport)).toBe(true);
    expect(READ_CENTER_RATIO).toBe(0.5);
  });
});

describe("applySmoothScrollTowardTarget", () => {
  it("moves toward the target every frame", () => {
    const first = applySmoothScrollTowardTarget(100, 0, 300, 1 / 60);
    expect(first.scrollTop).toBeGreaterThan(100);
    expect(first.scrollTop).toBeLessThan(300);
  });

  it("converges over repeated frames", () => {
    let scrollTop = 0;
    let carry = 0;
    for (let i = 0; i < 120; i += 1) {
      const step = applySmoothScrollTowardTarget(scrollTop, carry, 500, 1 / 60);
      scrollTop = step.scrollTop;
      carry = step.carryPx;
    }
    expect(scrollTop).toBeGreaterThan(470);
  });

  it("caps per-frame motion for large errors", () => {
    const step = applySmoothScrollTowardTarget(0, 0, 500, 1 / 60, 0.14, SCROLL_TRACK_MAX_PX_PER_SEC);
    const maxStep = Math.ceil(SCROLL_TRACK_MAX_PX_PER_SEC / 60);
    expect(step.scrollTop).toBeLessThanOrEqual(maxStep);
    expect(step.scrollTop).toBeGreaterThan(0);
  });
});
