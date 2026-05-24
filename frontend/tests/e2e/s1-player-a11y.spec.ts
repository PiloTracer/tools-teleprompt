import { expect, test } from "@playwright/test";

const SAMPLE_SCRIPT = "Accessibility audit line";
const SETTINGS = {
  speed: 1,
  fontSize: 22,
  sidePadding: 0,
  bottomPadding: 0,
  theme: "light" as const,
  mirror: false,
};

type AxeViolation = {
  id: string;
  impact?: string | null;
  description: string;
  nodes: Array<{ target: string[] }>;
};

test.describe("S1 player accessibility milestone", () => {
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

  test("player route exposes required roles and labels @s1-a11y", async ({ page }) => {
    await page.goto("/play");
    await page.waitForLoadState("networkidle");

    await expect(page.getByLabel("Teleprompter player")).toBeVisible();
    await expect(page.getByRole("toolbar", { name: "Player settings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("group", { name: /theme/i })).toHaveCount(0);
    await expect(page.getByRole("checkbox", { name: /mirror/i })).toBeVisible();
    await expect(page.getByLabel(/scroll speed/i)).toBeVisible();

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
  });

  test("axe wcag2aa on /play has no critical or serious violations @s1-a11y", async ({
    page,
  }) => {
    await page.goto("/play");
    await page.waitForLoadState("networkidle");

    await page.addScriptTag({
      url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js",
    });

    const results = await page.evaluate(async () => {
      const axe = (
        window as Window & {
          axe?: {
            run: (
              context: Document,
              options: { runOnly: string[] },
            ) => Promise<{ violations: AxeViolation[] }>;
          };
        }
      ).axe;
      if (!axe) {
        throw new Error("axe-core failed to load");
      }
      return axe.run(document, { runOnly: ["wcag2aa", "wcag21aa"] });
    });

    const blocking = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? ""),
    );

    if (blocking.length > 0) {
      const summary = blocking
        .map((v) => `${v.id} (${v.impact}): ${v.description}`)
        .join("\n");
      expect(blocking, summary).toEqual([]);
    }
  });

  test("dark theme player passes axe @s1-a11y", async ({ page }) => {
    await page.addInitScript(() => {
      const raw = localStorage.getItem("tp:settings");
      const settings = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      localStorage.setItem("tp:settings", JSON.stringify({ ...settings, theme: "dark" }));
    });

    await page.goto("/play");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".tp-player--dark")).toBeVisible();

    await page.addScriptTag({
      url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js",
    });

    const results = await page.evaluate(async () => {
      const axe = (
        window as Window & {
          axe?: {
            run: (
              context: Document,
              options: { runOnly: string[] },
            ) => Promise<{ violations: AxeViolation[] }>;
          };
        }
      ).axe;
      if (!axe) {
        throw new Error("axe-core failed to load");
      }
      return axe.run(document, { runOnly: ["wcag2aa", "wcag21aa"] });
    });

    const blocking = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? ""),
    );
    expect(blocking).toEqual([]);
  });
});
