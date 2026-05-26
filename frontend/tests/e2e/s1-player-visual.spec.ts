import { expect, test } from "@playwright/test";

const SAMPLE_SCRIPT = "S1 visual verify line one\nLine two for scroll";
const SETTINGS = {
  speed: 1,
  fontSize: 22,
  sidePadding: 0,
  bottomPadding: 0,
  theme: "light" as const,
  mirror: false,
};

test.describe("S1 player visual milestone", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      ({ script, settings }) => {
        localStorage.setItem("tp:script:source", script);
        localStorage.setItem("tp:script:format", "plain");
        localStorage.setItem("tp:settings", JSON.stringify(settings));
      },
      { script: SAMPLE_SCRIPT, settings: SETTINGS },
    );
  });

  test("player route shows tokenized toolbar and viewport @s1-visual", async ({ page }) => {
    await page.goto("/play");
    await page.waitForLoadState("networkidle");

    await expect(page.getByLabel("Teleprompter player")).toBeVisible();
    await expect(page.getByTestId("player-viewport")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("toolbar", { name: "Player settings" })).toBeVisible();
    await expect(page.getByRole("group", { name: /theme/i })).toHaveCount(0);
    await expect(page.getByRole("switch", { name: /mirror/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Full" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Shortcuts" })).toBeVisible();
    await expect(page.locator(".tp-player-toolbar__row")).toHaveCount(2);

    const playButton = page.getByRole("button", { name: "Play" });
    await expect(playButton).toHaveClass(/ds-button/);
    await expect(playButton).toHaveAttribute("data-variant", "primary");

    const toolbar = page.locator(".tp-player-toolbar");
    await expect(toolbar).toBeVisible();

    await page.screenshot({
      path: "../tmp/playwright-results/s1-player-desktop-light.png",
      fullPage: true,
    });
  });

  test("mobile viewport hides page title and shows bottom nav @s1-visual", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/play");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(".ds-mobile-nav")).toBeVisible();
    const pageTitle = page.locator(".tp-play-page__title");
    await expect(pageTitle).toHaveCSS("position", "absolute");
    await expect(pageTitle).toHaveCSS("width", "1px");

    await page.screenshot({
      path: "../tmp/playwright-results/s1-player-mobile-portrait.png",
      fullPage: true,
    });
  });
});
