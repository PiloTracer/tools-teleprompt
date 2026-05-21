import { expect, test } from "@playwright/test";

const RELAY_SCRIPT = "E2E relay handoff script line";

test.describe("relay handoff (J2)", () => {
  test("oversize script selects relay mode and blocks create", async ({ page }) => {
    await page.addInitScript(() => {
      const script = "x".repeat(300_000);
      localStorage.setItem("tp:script:source", script);
      localStorage.setItem("tp:script:format", "plain");
    });

    await page.goto("/handoff/create");
    await expect(page.getByTestId("handoff-mode-hint")).not.toContainText(/Checking handoff mode/i, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("handoff-mode-hint")).toContainText(/relay handoff/i);
    await page.getByTestId("handoff-relay-button").click();
    await expect(page.getByRole("alert").filter({ hasText: /too large/i })).toBeVisible();
  });

  test("claims relay session with OTP", async ({ page }) => {
    await page.route("**/api/v1/sessions/e2e-relay-token/claim", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ text: RELAY_SCRIPT, format: "plain" }),
      });
    });

    await page.goto("/handoff/claim/e2e-relay-token");
    await page.getByLabel(/one-time code/i).fill("123456");
    await page.getByRole("button", { name: /claim and open player/i }).click();

    await expect(page.getByTestId("player-viewport")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sanitized-html")).toContainText(RELAY_SCRIPT);
  });
});
