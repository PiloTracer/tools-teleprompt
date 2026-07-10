const WORD_SPLIT = /(\s+)/;

function isUrlLike(token: string): boolean {
  return /^https?:\/\//i.test(token) || /^www\./i.test(token);
}

type TokenSegment = { type: "word" | "sep"; value: string };

/**
 * Split a token into pronounceable word segments and separators.
 * Hyphenated words become separate words; URL-like tokens split at `://`, `/`,
 * and `.` boundaries so the matcher can advance through them. Separators are
 * preserved as plain text so the visible script is unchanged.
 */
function splitCompoundToken(token: string): TokenSegment[] {
  if (isUrlLike(token)) {
    return token
      .split(/(\/\/|\/|\.|:)/)
      .filter((segment) => segment !== "")
      .map((segment) => ({
        type:
          segment === "//" || segment === "/" || segment === "." || segment === ":"
            ? "sep"
            : "word",
        value: segment,
      }));
  }

  if (token.includes("-")) {
    return token
      .split(/(-)/)
      .filter((segment) => segment !== "")
      .map((segment) => ({
        type: segment === "-" ? "sep" : "word",
        value: segment,
      }));
  }

  return [{ type: "word", value: token }];
}

/** Wrap visible words in the script DOM with `data-word` indices for scroll targeting. */
export function annotateScriptWords(container: HTMLElement): string[] {
  const words: string[] = [];

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    if ((textNode.textContent ?? "").trim().length > 0) {
      textNodes.push(textNode);
    }
    node = walker.nextNode();
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? "";
    const parts = text.split(WORD_SPLIT);
    if (parts.length <= 1 && !parts[0]?.includes("-") && !isUrlLike(parts[0] ?? "")) {
      continue;
    }

    const fragment = document.createDocumentFragment();
    for (const part of parts) {
      if (/^\s*$/.test(part)) {
        fragment.appendChild(document.createTextNode(part));
        continue;
      }

      const segments = splitCompoundToken(part);
      for (const segment of segments) {
        if (segment.type === "sep") {
          fragment.appendChild(document.createTextNode(segment.value));
          continue;
        }

        const span = document.createElement("span");
        span.className = "tp-word";
        span.dataset.word = String(words.length);
        span.textContent = segment.value;
        words.push(segment.value);
        fragment.appendChild(span);
      }
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  return words;
}

/** True when word spans are present (annotation survived last React commit). */
export function hasScriptWordAnnotations(container: HTMLElement): boolean {
  return container.querySelector(".tp-word") !== null;
}

/** Annotate only when spans were wiped (e.g. innerHTML reset). Returns current word list. */
export function ensureScriptWordAnnotations(container: HTMLElement): string[] {
  if (hasScriptWordAnnotations(container)) {
    const spans = container.querySelectorAll<HTMLElement>(".tp-word");
    return Array.from(spans, (el) => el.textContent ?? "");
  }
  return annotateScriptWords(container);
}

export function findScriptWordElement(
  container: HTMLElement,
  wordIndex: number,
): HTMLElement | null {
  ensureScriptWordAnnotations(container);
  return container.querySelector<HTMLElement>(`.tp-word[data-word="${wordIndex}"]`);
}

/** Remove word spans so React can re-render cleanly. */
export function clearScriptWordAnnotations(container: HTMLElement): void {
  container.querySelectorAll(".tp-word").forEach((el) => {
    const text = el.textContent ?? "";
    el.replaceWith(document.createTextNode(text));
  });
  container.normalize();
}
