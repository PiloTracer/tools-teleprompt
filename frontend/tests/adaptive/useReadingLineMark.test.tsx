import { render } from "@testing-library/react";
import { createRef, type RefObject } from "react";
import { describe, expect, it } from "vitest";

import { READING_LINE_CLASS } from "../../src/prompter/adaptive/readingLineMark";
import { useReadingLineMark } from "../../src/prompter/adaptive/useReadingLineMark";

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

function MarkHarness({
  rootRef,
  readingWordIndex,
  engaged = true,
}: {
  rootRef: RefObject<HTMLElement | null>;
  readingWordIndex: number | null;
  engaged?: boolean;
}) {
  useReadingLineMark({
    scriptRootRef: rootRef,
    readingWordIndex,
    engaged,
    scriptWordsVersion: 1,
  });
  return null;
}

describe("useReadingLineMark", () => {
  it("clears the held reading mark during speech silence", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <span class="tp-word" data-word="0">Alpha</span>
      <span class="tp-word" data-word="1">beta</span>
    `;
    mockWordRect(root.querySelector('[data-word="0"]')!, 100);
    mockWordRect(root.querySelector('[data-word="1"]')!, 100);

    const rootRef = createRef<HTMLElement>();
    rootRef.current = root;

    const { rerender } = render(<MarkHarness rootRef={rootRef} readingWordIndex={0} />);

    expect(root.querySelectorAll(`.${READING_LINE_CLASS}`)).toHaveLength(2);

    rerender(<MarkHarness rootRef={rootRef} readingWordIndex={null} />);

    expect(root.querySelector(`.${READING_LINE_CLASS}`)).toBeNull();
  });
});
