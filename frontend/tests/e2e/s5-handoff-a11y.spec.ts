import { expect, test } from "@playwright/test";

type AxeViolation = {
  id: string;
  impact?: string | null;
  description: string;
};

test.describe("S5 handoff accessibility milestone", () => {
  test("claim form exposes OTP label and submit @s5-a11y", async ({ page }) => {
    await page.goto("/handoff/claim/s5-a11y-token");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /claim script/i })).toBeVisible();
    await expect(page.getByLabel(/one-time code/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /claim and open player/i })).toBeVisible();
  });

  test("LAN error alert is exposed to assistive tech @s5-a11y", async ({ page }) => {
    await page.route("**/api/v1/handoff/lan/missing-token", async (route) => {
      await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    });

    await page.goto("/handoff/lan/missing-token");
    await expect(page.getByRole("alert")).toHaveText(/expired or is invalid/i);
  });

  test("axe wcag2aa on claim page has no critical or serious violations @s5-a11y", async ({
    page,
  }) => {
    await page.goto("/handoff/claim/s5-a11y-token");
    await page.waitForLoadState("networkidle");

    await page.addScriptTag({
      url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js",
    });

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

    const blocking = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? ""),
    );
    expect(blocking).toEqual([]);
  });
});
