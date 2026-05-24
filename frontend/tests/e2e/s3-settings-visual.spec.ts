import { expect, test } from "@playwright/test";

const DEFAULT_SETTINGS = {
  speed: 1.2,
  fontSize: 22,
  sidePadding: 4,
  bottomPadding: 10,
  theme: "light" as const,
  mirror: false,
};

test.describe("S3 settings visual milestone", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      ({ settings }) => {
        localStorage.setItem("tp:settings", JSON.stringify(settings));
      },
      { settings: DEFAULT_SETTINGS },
    );
  });

  test("settings route shows catalog form on elevated card @s3-visual", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.locator("form.tp-settings.ds-card")).toBeVisible();

    await expect(page.getByRole("slider", { name: /scroll speed/i })).toBeVisible();
    await expect(page.getByRole("slider", { name: /font size/i })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: /theme/i })).toBeVisible();

    const saveButton = page.getByRole("button", { name: /save settings/i });
    await expect(saveButton).toHaveClass(/ds-button/);
    await expect(saveButton).toHaveAttribute("data-variant", "primary");

    await page.screenshot({
      path: "../tmp/playwright-results/s3-settings-desktop-light.png",
      fullPage: true,
    });
  });

  test("mobile settings shows full-width primary save @s3-visual", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const save = page.getByRole("button", { name: /save settings/i });
    await expect(save).toBeVisible();
    const saveBox = await save.boundingBox();
    const formBox = await page.locator("form.tp-settings").boundingBox();
    expect(saveBox).not.toBeNull();
    expect(formBox).not.toBeNull();
    if (saveBox && formBox) {
      expect(saveBox.width).toBeGreaterThan(formBox.width * 0.85);
    }

    await page.screenshot({
      path: "../tmp/playwright-results/s3-settings-mobile-light.png",
      fullPage: true,
    });
  });

  test("dark theme applies to document root after save @s3-visual", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await page.locator("label.ds-segmented__option").filter({ hasText: "Dark" }).click();
    await page.getByRole("button", { name: /save settings/i }).click();

    await expect(page.getByRole("status")).toHaveText(/saved/i);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.screenshot({
      path: "../tmp/playwright-results/s3-settings-desktop-dark.png",
      fullPage: true,
    });
  });
});
