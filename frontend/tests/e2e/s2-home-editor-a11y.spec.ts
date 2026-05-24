import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const AXE_FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/axe.min.js",
);

const SAMPLE_SCRIPT = "Accessibility audit editor line";

type AxeViolation = {
  id: string;
  impact?: string | null;
  description: string;
  nodes: Array<{ target: string[] }>;
};

async function runAxe(page: import("@playwright/test").Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: AXE_FIXTURE });

  const results = await page.evaluate(async () => {
    const axe = (
      window as Window & {
        axe?: {
          run: (
            context: Document,
            options: { runOnly: string[] },
          ) => Promise<{ violations: AxeViolation[] }>;
        };
      }
    ).axe;
    if (!axe) {
      throw new Error("axe-core failed to load");
    }
    return axe.run(document, { runOnly: ["wcag2aa", "wcag21aa"] });
  });

  return results.violations.filter((v) => ["critical", "serious"].includes(v.impact ?? ""));
}

test.describe("S2 home editor accessibility milestone", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      ({ script }) => {
        localStorage.setItem("tp:script:source", script);
        localStorage.setItem("tp:script:format", "markdown");
      },
      { script: SAMPLE_SCRIPT },
    );
  });

  test("editor exposes labels, format radiogroup, and upload @s2-a11y", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("textbox", { name: /script/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /upload/i })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: /script format/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /markdown/i })).toBeChecked();
    await expect(page.getByRole("heading", { name: /preview/i })).toBeVisible();

    const textarea = page.getByRole("textbox", { name: /script/i });
    await expect(textarea).toHaveAttribute("aria-describedby", "tp-editor-hint");
  });

  test("axe wcag2aa on / has no critical or serious violations @s2-a11y", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const blocking = await runAxe(page);
    if (blocking.length > 0) {
      const summary = blocking
        .map((v) => `${v.id} (${v.impact}): ${v.description}`)
        .join("\n");
      expect(blocking, summary).toEqual([]);
    }
  });

  test("mobile upload and format controls meet touch target height @s2-a11y", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const upload = page.getByRole("button", { name: /upload/i });
    const uploadBox = await upload.boundingBox();
    expect(uploadBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    const formatLabel = page.getByRole("radio", { name: /plain text/i }).locator("..").locator(".ds-segmented__label");
    const formatBox = await formatLabel.boundingBox();
    expect(formatBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
