import { expect, test } from "@playwright/test";

const SAMPLE_SCRIPT = "S2 home editor visual verify\nSecond line for preview";

test.describe("S2 home editor visual milestone", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      ({ script }) => {
        localStorage.setItem("tp:script:source", script);
        localStorage.setItem("tp:script:format", "plain");
      },
      { script: SAMPLE_SCRIPT },
    );
  });

  test("editor route shows two-column grid and catalog controls @s2-visual", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const grid = page.locator(".tp-home-grid");
    await expect(grid).toBeVisible();
    await expect(page.locator(".tp-editor.ds-card")).toBeVisible();
    await expect(page.locator(".tp-preview-panel.ds-card")).toBeVisible();

    const columnCount = await grid.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length,
    );
    expect(columnCount).toBe(2);

    const editorBox = await page.locator(".tp-editor").boundingBox();
    const previewBox = await page.locator(".tp-preview-panel").boundingBox();
    expect(editorBox).not.toBeNull();
    expect(previewBox).not.toBeNull();
    if (editorBox && previewBox) {
      expect(editorBox.x).toBeLessThan(previewBox.x);
      expect(editorBox.width).toBeGreaterThan(200);
      expect(previewBox.width).toBeGreaterThan(200);
    }

    await expect(page.getByRole("textbox", { name: /script/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /upload/i })).toHaveClass(/ds-button/);
    await expect(page.getByRole("radiogroup", { name: /script format/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /plain text/i })).toBeChecked();

    await page.screenshot({
      path: "../tmp/playwright-results/s2-editor-desktop.png",
      fullPage: true,
    });
  });

  test("mobile viewport stacks editor above preview @s2-visual", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const editorBox = await page.locator(".tp-editor").boundingBox();
    const previewBox = await page.locator(".tp-preview-panel").boundingBox();
    expect(editorBox).not.toBeNull();
    expect(previewBox).not.toBeNull();
    if (editorBox && previewBox) {
      expect(editorBox.y).toBeLessThan(previewBox.y);
    }

    await expect(page.locator(".ds-mobile-nav")).toBeVisible();

    const mobileNav = page.locator(".ds-mobile-nav");
    await expect(mobileNav.getByRole("link", { name: "Editor" })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Player" })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Handoff" })).toBeVisible();

    const links = mobileNav.getByRole("link");
    await expect(links).toHaveCount(4);
    for (const link of await links.all()) {
      const fits = await link.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
      expect(fits, `nav label clipped: ${await link.textContent()}`).toBe(true);
    }

    await page.screenshot({
      path: "../tmp/playwright-results/s2-editor-mobile.png",
      fullPage: true,
    });
  });
});
