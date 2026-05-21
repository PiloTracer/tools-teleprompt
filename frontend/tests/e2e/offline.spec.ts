import { expect, test } from "@playwright/test";

const SETTINGS = {
  speed: 1,
  fontSize: 24,
  theme: "light",
  mirror: false,
};

test.describe("offline prompter", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      ({ script, settings }) => {
        localStorage.setItem("tp:script:source", script);
        localStorage.setItem("tp:script:format", "plain");
        localStorage.setItem("tp:settings", JSON.stringify(settings));
      },
      { script: "Offline teleprompter line", settings: SETTINGS },
    );
  });

  test("cached shell loads and local script plays offline @offline", async ({ page, context }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.waitForFunction(
      () => "serviceWorker" in navigator && navigator.serviceWorker.controller !== null,
      { timeout: 60_000 },
    );

    await page.getByRole("link", { name: "Player" }).click();
    await expect(page.getByTestId("player-viewport")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sanitized-html")).toContainText("Offline teleprompter line");

    await context.setOffline(true);

    await page.getByRole("link", { name: "Editor" }).click();
    await page.getByRole("link", { name: "Player" }).click();

    await expect(page.getByLabel("Teleprompter player")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sanitized-html")).toContainText("Offline teleprompter line");

    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  });
});
