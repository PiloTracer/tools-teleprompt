import { expect, test } from "@playwright/test";

const LAN_SCRIPT = "E2E LAN handoff script line";
const LAN_TOKEN = "e2eLanToken1234567890ab";

test.describe("LAN handoff (J2c)", () => {
  test("creates LAN link and loads player on consume route", async ({ page }) => {
    await page.route("**/api/v1/handoff/lan", async (route, request) => {
      if (request.method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          token: LAN_TOKEN,
          claim_url: `/api/v1/handoff/lan/${LAN_TOKEN}`,
          expires_at: new Date(Date.now() + 120_000).toISOString(),
        }),
      });
    });

    await page.route(`**/api/v1/handoff/lan/${LAN_TOKEN}`, async (route, request) => {
      if (request.method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ text: LAN_SCRIPT, format: "plain" }),
      });
    });

    await page.addInitScript((script) => {
      // Force LAN mode: serverless QR paths require CompressionStream.
      Reflect.deleteProperty(globalThis, "CompressionStream");
      Reflect.deleteProperty(globalThis, "DecompressionStream");
      localStorage.setItem("tp:script:source", script);
      localStorage.setItem("tp:script:format", "plain");
    }, LAN_SCRIPT);

    await page.goto("/handoff/create");
    await expect(page.getByTestId("handoff-mode-hint")).not.toContainText(/Checking handoff mode/i, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("handoff-mode-hint")).toContainText(/LAN one-shot/i);
    await page.getByTestId("handoff-lan-button").click();
    await expect(page.getByTestId("handoff-lan-mode")).toBeVisible();

    const lanLink = page.locator('[data-testid="handoff-lan-mode"] a');
    const href = await lanLink.getAttribute("href");
    expect(href).toMatch(new RegExp(`/handoff/lan/${LAN_TOKEN}$`));

    await page.goto(href!);
    await expect(page.getByTestId("player-viewport")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sanitized-html")).toContainText(LAN_SCRIPT);
  });
});
