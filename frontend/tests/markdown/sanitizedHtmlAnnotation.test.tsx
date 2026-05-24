import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { annotateScriptWords } from "../../src/prompter/adaptive/annotateScriptWords";
import { asSafeHtml } from "../../src/markdown/types";
import { SanitizedHtml } from "../../src/markdown/SanitizedHtml";

describe("SanitizedHtml annotation stability", () => {
  it("keeps imperative word spans when an unrelated parent prop changes", () => {
    const html = asSafeHtml("<p>Hola mundo desde el teleprompter</p>");

    function Parent({ tick }: { tick: number }) {
      return (
        <div data-tick={tick}>
          <SanitizedHtml html={html} className="tp-player-script" />
        </div>
      );
    }

    const { container, rerender } = render(<Parent tick={0} />);
    const scriptRoot = container.querySelector(".tp-player-script") as HTMLElement;
    expect(scriptRoot).toBeTruthy();

    annotateScriptWords(scriptRoot);
    expect(scriptRoot.querySelector('[data-word="0"]')).toBeTruthy();

    rerender(<Parent tick={1} />);

    expect(scriptRoot.querySelector('[data-word="0"]')?.textContent).toBe("Hola");
    expect(scriptRoot.querySelector('[data-word="1"]')?.textContent).toBe("mundo");
  });
});
