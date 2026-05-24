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

const HANDOFF_SCRIPT = "S4 a11y handoff script line.\n";

test.describe("S4 handoff accessibility milestone", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      ({ script }) => {
        localStorage.setItem("tp:script:source", script);
        localStorage.setItem("tp:script:format", "plain");
      },
      { script: HANDOFF_SCRIPT },
    );
  });

  test("create page exposes heading, mode hint, and primary CTA @s4-a11y", async ({ page }) => {
    await page.goto("/handoff/create");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /cross-device handoff/i })).toBeVisible();
    await expect(page.getByTestId("handoff-mode-hint")).toBeVisible();
    await expect(page.getByRole("link", { name: /back to editor/i })).toBeVisible();
  });

  test("axe wcag2aa on /handoff/create has no critical or serious violations @s4-a11y", async ({
    page,
  }) => {
    await page.goto("/handoff/create");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /cross-device handoff/i })).toBeVisible();

    const blocking = await runAxe(page);
    if (blocking.length > 0) {
      const summary = blocking
        .map((v) => `${v.id} (${v.impact}): ${v.description}`)
        .join("\n");
      expect(blocking, summary).toEqual([]);
    }
  });

  test("QR receive error alert is exposed to assistive tech @s4-a11y", async ({ page }) => {
    await page.goto("/handoff/receive");
    await page.waitForLoadState("networkidle");

    const alert = page.locator(".ds-alert[data-variant='error']");
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).toHaveAttribute("role", "alert");
  });

  test("multi-QR prev/next meet touch height when generated @s4-a11y", async ({ page }) => {
    await page.route("**/api/v1/handoff/public-config", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          spa_public_origin: "http://10.42.0.1:9173",
          public_base_url: "http://10.42.0.1:9080",
        }),
      });
    });

    const bigScript =
      HANDOFF_SCRIPT + Array.from({ length: 700 }, () => crypto.randomUUID()).join("\n");
    await page.addInitScript((script: string) => {
      localStorage.setItem("tp:script:source", script);
    }, bigScript);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/handoff/create");
    await expect(page.getByTestId("handoff-mode-hint")).toContainText(/multiple QR/i, {
      timeout: 20_000,
    });
    await page.getByTestId("multi-qr-generate").click();
    await expect(page.getByTestId("multi-qr-image")).toBeVisible({ timeout: 60_000 });

    const next = page.getByTestId("multi-qr-next");
    const box = await next.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
