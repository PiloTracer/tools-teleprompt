import { describe, expect, it } from "vitest";

import {
  annotateScriptWords,
  clearScriptWordAnnotations,
  ensureScriptWordAnnotations,
  findScriptWordElement,
  hasScriptWordAnnotations,
} from "../../src/prompter/adaptive/annotateScriptWords";

describe("annotateScriptWords", () => {
  it("wraps words with sequential data-word indices", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p>Hola mundo</p>";

    const words = annotateScriptWords(container);

    expect(words).toEqual(["Hola", "mundo"]);
    expect(container.querySelector('[data-word="0"]')?.textContent).toBe("Hola");
    expect(container.querySelector('[data-word="1"]')?.textContent).toBe("mundo");
  });

  it("clears annotations for re-render", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p>One two</p>";
    annotateScriptWords(container);
    clearScriptWordAnnotations(container);

    expect(container.querySelector(".tp-word")).toBeNull();
    expect(container.textContent).toContain("One two");
  });

  it("ensureScriptWordAnnotations re-wraps when spans were wiped", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p>One two three</p>";
    annotateScriptWords(container);
    container.innerHTML = "<p>One two three</p>";

    expect(hasScriptWordAnnotations(container)).toBe(false);
    const words = ensureScriptWordAnnotations(container);
    expect(words).toEqual(["One", "two", "three"]);
    expect(container.querySelector('[data-word="2"]')?.textContent).toBe("three");
  });

  it("ensureScriptWordAnnotations reads existing spans without re-wrapping", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p>Alpha beta</p>";
    annotateScriptWords(container);
    const marker = container.querySelector('[data-word="0"]');

    const words = ensureScriptWordAnnotations(container);
    expect(words).toEqual(["Alpha", "beta"]);
    expect(container.querySelector('[data-word="0"]')).toBe(marker);
  });

  it("findScriptWordElement ensures annotations before lookup", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p>One two three</p>";
    container.innerHTML = "<p>One two three</p>";

    const word = findScriptWordElement(container, 2);
    expect(word?.textContent).toBe("three");
    expect(container.querySelectorAll(".tp-word")).toHaveLength(3);
  });
});
