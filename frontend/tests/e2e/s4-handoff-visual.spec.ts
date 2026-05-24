import { expect, test } from "@playwright/test";

const SMALL_SCRIPT = "S4 handoff visual — short script for QR mode.";

test.describe("S4 handoff visual milestone", () => {
  test("index redirects to create @s4-visual", async ({ page }) => {
    await page.goto("/handoff");
    await expect(page).toHaveURL(/\/handoff\/create$/);
  });

  test("empty script shows elevated card and editor link @s4-visual", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("tp:script:source");
      localStorage.setItem("tp:script:format", "plain");
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/handoff/create");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /cross-device handoff/i })).toBeVisible();
    await expect(page.locator(".ds-card")).toBeVisible();
    await expect(page.locator(".ds-card").getByRole("link", { name: /back to editor/i })).toBeVisible();

    await page.screenshot({
      path: "../tmp/playwright-results/s4-handoff-empty-desktop.png",
      fullPage: true,
    });
  });

  test("multi-QR mode shows primary generate and origin chip @s4-visual", async ({ page }) => {
    const largeScript =
      SMALL_SCRIPT + Array.from({ length: 700 }, () => crypto.randomUUID()).join("\n");
    await page.addInitScript(
      ({ script }) => {
        localStorage.setItem("tp:script:source", script);
        localStorage.setItem("tp:script:format", "plain");
      },
      { script: largeScript },
    );

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

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/handoff/create");
    await expect(page.getByTestId("handoff-mode-hint")).not.toContainText(/checking handoff mode/i, {
      timeout: 20_000,
    });
    await expect(page.getByTestId("handoff-mode-hint")).toContainText(/multiple QR/i);
    await expect(page.getByTestId("handoff-multi-qr-mode")).toBeVisible();

    const generateBtn = page.getByTestId("multi-qr-generate");
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toHaveClass(/ds-button/);
    await expect(generateBtn).toHaveAttribute("data-variant", "primary");
    await expect(page.locator(".tp-handoff-origin")).toBeVisible();

    await page.screenshot({
      path: "../tmp/playwright-results/s4-handoff-multi-desktop.png",
      fullPage: true,
    });
  });

  test("single-QR result uses QrFrame and copy affordance @s4-visual", async ({ page }) => {
    await page.addInitScript(
      ({ script }) => {
        localStorage.setItem("tp:script:source", script);
        localStorage.setItem("tp:script:format", "plain");
      },
      { script: SMALL_SCRIPT },
    );

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

    await page.goto("/handoff/create");
    await expect(page.getByTestId("handoff-mode-hint")).toContainText(/single-QR/i, {
      timeout: 20_000,
    });
    await page.getByTestId("handoff-qr-button").click();
    await expect(page.getByTestId("handoff-qr-image")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".ds-qr-frame")).toBeVisible();
    await expect(page.getByRole("button", { name: /copy link/i })).toBeVisible();

    await page.screenshot({
      path: "../tmp/playwright-results/s4-handoff-qr-result.png",
      fullPage: true,
    });
  });

  test("mobile handoff create layout @s4-visual", async ({ page }) => {
    await page.addInitScript(
      ({ script }) => {
        localStorage.setItem("tp:script:source", script);
        localStorage.setItem("tp:script:format", "plain");
      },
      { script: SMALL_SCRIPT },
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/handoff/create");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /cross-device handoff/i })).toBeVisible();
    const primary = page.getByRole("button").filter({ hasText: /generate|create/i }).first();
    const box = await primary.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    await page.screenshot({
      path: "../tmp/playwright-results/s4-handoff-mobile.png",
      fullPage: true,
    });
  });

  test("QR receive error uses ds-alert @s4-visual", async ({ page }) => {
    await page.goto("/handoff/receive");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(".ds-alert[data-variant='error']")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(".ds-card")).toBeVisible();

    await page.screenshot({
      path: "../tmp/playwright-results/s4-handoff-receive-error.png",
      fullPage: true,
    });
  });
});
