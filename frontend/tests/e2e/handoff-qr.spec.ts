import { expect, test } from "@playwright/test";

const QR_SCRIPT = "E2E QR handoff script line";

test.describe("QR handoff (J2b)", () => {
  test("generates QR link and loads player without API calls", async ({ page }) => {
    const apiRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/")) {
        apiRequests.push(request.url());
      }
    });

    await page.addInitScript((script) => {
      localStorage.setItem("tp:script:source", script);
      localStorage.setItem("tp:script:format", "plain");
    }, QR_SCRIPT);

    await page.goto("/handoff/create");
    await expect(page.getByTestId("handoff-mode-hint")).not.toContainText(/Checking handoff mode/i, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("handoff-mode-hint")).toContainText(/QR handoff/i);
    await page.getByTestId("handoff-qr-button").click();
    await expect(page.getByTestId("handoff-qr-image")).toBeVisible();

    const handoffLink = page.locator('[data-testid="handoff-qr-mode"] a');
    const href = await handoffLink.getAttribute("href");
    expect(href).toMatch(/\/handoff\/receive#tp=v1\./);

    await page.goto(href!);
    await expect(page.getByTestId("player-viewport")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sanitized-html")).toContainText(QR_SCRIPT);
    expect(apiRequests).toHaveLength(0);
  });
});
