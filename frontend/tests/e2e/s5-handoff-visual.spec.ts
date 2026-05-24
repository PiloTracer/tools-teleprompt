import { expect, test } from "@playwright/test";

test.describe("S5 handoff visual milestone", () => {
  test("LAN consume loading uses receive card layout @s5-visual", async ({ page }) => {
    await page.route("**/api/v1/handoff/lan/s5-visual-token", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ text: "LAN visual script", format: "plain" }),
      });
    });

    await page.goto("/handoff/lan/s5-visual-token");
    await expect(page.getByRole("heading", { name: /receive script \(lan\)/i })).toBeVisible();
    await expect(page.getByTestId("lan-consuming")).toBeVisible();
    await expect(page.locator(".ds-card")).toBeVisible();

    await page.screenshot({
      path: "../tmp/playwright-results/s5-handoff-lan-loading.png",
      fullPage: true,
    });
  });

  test("claim form uses ds-card, otp input, and primary button @s5-visual", async ({ page }) => {
    await page.goto("/handoff/claim/s5-visual-token");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /claim script/i })).toBeVisible();
    await expect(page.getByTestId("handoff-claim-form")).toBeVisible();
    await expect(page.locator(".ds-otp-input")).toBeVisible();
    await expect(page.getByRole("button", { name: /claim and open player/i })).toHaveClass(
      /ds-button/,
    );

    await page.screenshot({
      path: "../tmp/playwright-results/s5-handoff-claim-form.png",
      fullPage: true,
    });
  });

  test("LAN expired error uses ds-alert in card @s5-visual", async ({ page }) => {
    await page.route("**/api/v1/handoff/lan/expired-token", async (route) => {
      await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    });

    await page.goto("/handoff/lan/expired-token");
    await expect(page.locator(".ds-alert[data-variant=error]")).toBeVisible();
    await expect(page.getByRole("link", { name: /back to editor/i })).toHaveCount(0);

    await page.screenshot({
      path: "../tmp/playwright-results/s5-handoff-lan-error.png",
      fullPage: true,
    });
  });
});
