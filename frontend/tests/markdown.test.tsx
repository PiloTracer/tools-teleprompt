import { render, screen } from "@testing-library/react";

import { renderScript } from "../src/markdown/render";
import { SanitizedHtml } from "../src/markdown/SanitizedHtml";
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
