import { render, screen } from "@testing-library/react";

import { renderScript } from "../src/markdown/render";
import { SanitizedHtml } from "../src/markdown/SanitizedHtml";
import { isMetaSourceLine } from "../src/markdown/sanitize";
import { asSafeHtml } from "../src/markdown/types";
import fixtures from "./xss-fixtures.json";

type Fixture = {
  id: string;
  format: "plain" | "markdown";
  source: string;
};

const xssFixtures = fixtures as Fixture[];

function renderPipeline(source: string, format: "plain" | "markdown") {
  const html = renderScript(source, format);
  return render(<SanitizedHtml html={html} />);
}

describe("renderScript", () => {
  it("returns empty fragment for empty source", () => {
    expect(renderScript("", "plain")).toBe("");
    expect(renderScript("", "markdown")).toBe("");
  });

  it("displays plain script tags as escaped text (R2)", () => {
    const { container } = renderPipeline("<script>alert(1)</script>", "plain");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector(".tp-plain")?.textContent).toContain("<script>");
  });

  it("renders markdown headings", () => {
    const html = renderScript("# Title", "markdown");
    const { container } = render(<SanitizedHtml html={html} />);
    expect(container.querySelector("h1")?.textContent).toBe("Title");
  });

  it("adds rel and target on markdown links (R4)", () => {
    const html = renderScript("[Example](https://example.com)", "markdown");
    const { container } = render(<SanitizedHtml html={html} />);
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("renders blockquote with tp-meta class (R9)", () => {
    const html = renderScript("> stage direction", "markdown");
    const { container } = render(<SanitizedHtml html={html} />);
    const blockquote = container.querySelector("blockquote");
    expect(blockquote?.classList.contains("tp-meta")).toBe(true);
    expect(blockquote?.textContent).toContain("stage direction");
  });

  it("re-exports isMetaSourceLine aligned with blockquote prefix (R10)", () => {
    expect(isMetaSourceLine("> whisper")).toBe(true);
    expect(isMetaSourceLine("Hello world")).toBe(false);
  });

  it("tags markdown block elements with data-line-start / data-line-end (adaptive)", () => {
    // The adaptive teleprompter reads these attributes from the rendered DOM
    // to measure ACTUAL line positions (accounting for paragraph margins,
    // padding, and wrap) instead of using a fictional `i * lineHeight` model.
    const source = ["First paragraph.", "", "Second paragraph.", "", "# Heading"].join("\n");
    const { container } = renderPipeline(source, "markdown");
    const tagged = container.querySelectorAll("[data-line-start]");
    expect(tagged.length).toBeGreaterThanOrEqual(3);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs[0]?.getAttribute("data-line-start")).toBe("0");
    expect(paragraphs[1]?.getAttribute("data-line-start")).toBe("2");

    const heading = container.querySelector("h1");
    expect(heading?.getAttribute("data-line-start")).toBe("4");
  });

  it("wraps each plain-text line in a span with data-line-index (adaptive)", () => {
    const source = ["Line zero.", "Line one.", "Line two."].join("\n");
    const { container } = renderPipeline(source, "plain");
    const spans = container.querySelectorAll<HTMLElement>("span[data-line-index]");
    expect(spans.length).toBe(3);
    expect(spans[0]?.getAttribute("data-line-index")).toBe("0");
    expect(spans[1]?.textContent).toBe("Line one.");
    expect(spans[2]?.getAttribute("data-line-index")).toBe("2");
  });
});

describe("markdown XSS corpus (R8)", () => {
  it.each(xssFixtures)("$id does not execute scripts or inject script nodes", (fixture) => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const { container, unmount } = renderPipeline(fixture.source, fixture.format);

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("object")).toBeNull();
    expect(container.querySelector("embed")).toBeNull();
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
    unmount();
  });

  it("has at least ten XSS vectors", () => {
    expect(xssFixtures.length).toBeGreaterThanOrEqual(10);
  });
});

describe("SanitizedHtml", () => {
  it("renders nothing for empty SafeHtml", () => {
    render(<SanitizedHtml html={asSafeHtml("")} />);
    expect(screen.queryByTestId("sanitized-html")).toBeNull();
  });
});
