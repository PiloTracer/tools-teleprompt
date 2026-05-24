import { describe, expect, it } from "vitest";

import {
  clearReadingLineMark,
  findMarkedReadingLine,
  markReadingLine,
  READING_LINE_CLASS,
} from "../../src/prompter/adaptive/readingLineMark";

function mockWordRect(el: HTMLElement, top: number, height = 20): void {
  Object.defineProperty(el, "getBoundingClientRect", {
    value: () => ({
      top,
      bottom: top + height,
      left: 0,
      right: 0,
      width: 0,
      height,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }),
  });
}

describe("readingLineMark", () => {
  it("highlights every word on the same visual row", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <span class="tp-word" data-word="0">One</span>
      <span class="tp-word" data-word="1">two</span>
      <span class="tp-word" data-word="2" style="display:block;margin-top:40px">Next</span>
    `;

    mockWordRect(root.querySelector('[data-word="0"]')!, 100);
    mockWordRect(root.querySelector('[data-word="1"]')!, 100);
    mockWordRect(root.querySelector('[data-word="2"]')!, 160);

    markReadingLine(root, 0);

    expect(root.querySelector('[data-word="0"]')?.classList.contains(READING_LINE_CLASS)).toBe(
      true,
    );
    expect(root.querySelector('[data-word="1"]')?.classList.contains(READING_LINE_CLASS)).toBe(
      true,
    );
    expect(root.querySelector('[data-word="2"]')?.classList.contains(READING_LINE_CLASS)).toBe(
      false,
    );
  });

  it("moves the mark when the reading word advances to another row", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <span class="tp-word" data-word="0">Alpha</span>
      <span class="tp-word" data-word="1" style="display:block">Beta</span>
    `;

    mockWordRect(root.querySelector('[data-word="0"]')!, 100);
    mockWordRect(root.querySelector('[data-word="1"]')!, 160);

    markReadingLine(root, 0);
    markReadingLine(root, 1);

    expect(root.querySelector('[data-word="0"]')?.classList.contains(READING_LINE_CLASS)).toBe(
      false,
    );
    expect(root.querySelector('[data-word="1"]')?.classList.contains(READING_LINE_CLASS)).toBe(
      true,
    );
  });

  it("finds the marked line anchor after annotation", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <p>
        <span class="tp-word" data-word="0">Hello</span>
        <span class="tp-word" data-word="1">world</span>
      </p>
    `;

    mockWordRect(root.querySelector('[data-word="0"]')!, 100);
    mockWordRect(root.querySelector('[data-word="1"]')!, 100);

    markReadingLine(root, 1);

    const anchor = findMarkedReadingLine(root);
    expect(anchor?.dataset.word).toBe("0");
    expect(anchor?.textContent).toBe("Hello");
    expect(root.querySelector('[data-word="1"]')?.classList.contains(READING_LINE_CLASS)).toBe(
      true,
    );
  });

  it("clears all reading marks", () => {
    const root = document.createElement("div");
    root.innerHTML = `<span class="tp-word tp-word--reading" data-word="0">Hi</span>`;

    clearReadingLineMark(root);

    expect(root.querySelector(`.${READING_LINE_CLASS}`)).toBeNull();
  });
});
