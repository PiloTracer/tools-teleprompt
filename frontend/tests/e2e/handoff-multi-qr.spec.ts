import { expect, test } from "@playwright/test";

import { encodeMultiQrHandoff } from "../../src/pairing/qrChunkEncode";

const MULTI_SCRIPT = "E2E multi-QR handoff script marker\n";
const PREVIEW_ORIGIN = "http://127.0.0.1:4173";

function buildMultiQrScript(): string {
  return MULTI_SCRIPT + Array.from({ length: 700 }, () => crypto.randomUUID()).join("\n");
}

test.describe("multi-QR handoff (J2d)", () => {
  test("selects multi-QR mode and reassembles chunks without API calls", async ({ page }) => {
    const apiRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/")) {
        apiRequests.push(request.url());
      }
    });

    const script = buildMultiQrScript();
    const chunks = await encodeMultiQrHandoff(script, "plain", PREVIEW_ORIGIN);
    expect(chunks.length).toBeGreaterThan(1);

    await page.addInitScript((payload) => {
      localStorage.setItem("tp:script:source", payload);
      localStorage.setItem("tp:script:format", "plain");
    }, script);

    await page.goto("/handoff/create");
    await expect(page.getByTestId("handoff-mode-hint")).not.toContainText(/Checking handoff mode/i, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("handoff-mode-hint")).toContainText(/multiple QR/i);
    await expect(page.getByTestId("handoff-multi-qr-mode")).toBeVisible();
    await expect(page.getByTestId("multi-qr-generate")).toBeEnabled({ timeout: 15_000 });

    for (let index = 0; index < chunks.length; index += 1) {
      const path = chunks[index]!.handoffUrl.replace(PREVIEW_ORIGIN, "");
      await page.goto(path);
      if (index < chunks.length - 1) {
        await expect(page.getByTestId("multi-qr-pending")).toBeVisible();
      }
    }

    await expect(page.getByTestId("player-viewport")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sanitized-html")).toContainText(MULTI_SCRIPT.trim());
    expect(apiRequests).toHaveLength(0);
  });
});
