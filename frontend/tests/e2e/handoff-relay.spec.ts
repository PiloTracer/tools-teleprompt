import { expect, test } from "@playwright/test";

const RELAY_SCRIPT = "E2E relay handoff script line";

test.describe("relay handoff (J2)", () => {
  test("creates session and claims with OTP", async ({ page }) => {
    await page.route("**/api/v1/sessions", async (route, request) => {
      if (request.method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          token: "e2e-relay-token",
          otp: "123456",
          claim_url: "/handoff/claim/e2e-relay-token",
          expires_at: new Date(Date.now() + 300_000).toISOString(),
        }),
      });
    });

    await page.route("**/api/v1/sessions/e2e-relay-token/claim", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ text: RELAY_SCRIPT, format: "plain" }),
      });
    });

    await page.addInitScript(() => {
      const script = Array.from({ length: 700 }, () => crypto.randomUUID()).join("\n");
      localStorage.setItem("tp:script:source", script);
      localStorage.setItem("tp:script:format", "plain");
    });

    await page.goto("/handoff/create");
    await expect(page.getByTestId("handoff-mode-hint")).not.toContainText(/Checking handoff mode/i, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("handoff-mode-hint")).toContainText(/relay handoff/i);
    await page.getByTestId("handoff-relay-button").click();
    await expect(page.getByTestId("handoff-session")).toBeVisible();
    await expect(page.getByText("123456")).toBeVisible();

    await page.goto("/handoff/claim/e2e-relay-token");
    await page.getByLabel(/one-time code/i).fill("123456");
    await page.getByRole("button", { name: /claim and open player/i }).click();

    await expect(page.getByTestId("player-viewport")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sanitized-html")).toContainText(RELAY_SCRIPT);
  });
});