import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const AXE_FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/axe.min.js",
);

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

test.describe("S3 settings accessibility milestone", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        "tp:settings",
        JSON.stringify({
          speed: 1,
          fontSize: 24,
          sidePadding: 0,
          bottomPadding: 0,
          theme: "light",
          mirror: false,
        }),
      );
    });
  });

  test("settings form exposes sliders, theme radiogroup, and save @s3-a11y", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(await page.getByRole("slider").count()).toBe(4);
    await expect(page.getByRole("radiogroup", { name: /theme/i })).toBeVisible();
    await expect(page.getByRole("switch", { name: /mirror/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /save settings/i })).toBeVisible();
  });

  test("axe wcag2aa on /settings has no critical or serious violations @s3-a11y", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const blocking = await runAxe(page);
    if (blocking.length > 0) {
      const summary = blocking
        .map((v) => `${v.id} (${v.impact}): ${v.description}`)
        .join("\n");
      expect(blocking, summary).toEqual([]);
    }
  });

  test("axe passes on /settings with dark document theme @s3-a11y", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "tp:settings",
        JSON.stringify({
          speed: 1,
          fontSize: 24,
          sidePadding: 0,
          bottomPadding: 0,
          theme: "dark",
          mirror: false,
        }),
      );
    });

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("form.tp-settings")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const blocking = await runAxe(page);
    expect(blocking).toEqual([]);
  });

  test("mobile save and theme controls meet touch target height @s3-a11y", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const save = page.getByRole("button", { name: /save settings/i });
    const saveBox = await save.boundingBox();
    expect(saveBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    const themeLabel = page
      .getByRole("radio", { name: /light/i })
      .locator("..")
      .locator(".ds-segmented__label");
    const themeBox = await themeLabel.boundingBox();
    expect(themeBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
