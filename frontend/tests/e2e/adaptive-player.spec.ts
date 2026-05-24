import { expect, test } from "@playwright/test";

const LONG_SCRIPT = `${"Spoken line for scroll.\n".repeat(40)}[DATACARD]\n${"More dialogue.\n".repeat(20)}`;

const BASE_SETTINGS = {
  speed: 1,
  fontSize: 22,
  sidePadding: 0,
  bottomPadding: 0,
  theme: "light" as const,
  mirror: false,
};

function mockMediaPipeline(initScript: () => void) {
  return async ({
    context,
  }: {
    context: import("@playwright/test").BrowserContext;
  }) => {
    await context.addInitScript(initScript);
  };
}

const installMockMic = mockMediaPipeline(() => {
  class MockAnalyserNode {
    fftSize = 2048;

    getByteTimeDomainData(arr: Uint8Array): void {
      arr.fill(128);
    }
  }

  class MockAudioContext {
    state: AudioContextState = "running";

    createMediaStreamSource = () => ({ connect: () => undefined });

    createAnalyser = () => new MockAnalyserNode();

    resume = async () => undefined;

    close = async () => undefined;
  }

  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    value: MockAudioContext,
  });

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => ({
        getTracks: () => [{ stop: () => undefined }],
      }),
    },
  });
});

test.describe("Adaptive player (M8-T10)", () => {
  test.beforeEach(installMockMic);

  test("hides mic button when adaptive is off (I5, I2)", async ({ page, context }) => {
    await context.addInitScript(
      ({ script, settings }) => {
        localStorage.setItem("tp:script:source", script);
        localStorage.setItem("tp:script:format", "plain");
        localStorage.setItem("tp:settings", JSON.stringify(settings));
      },
      {
        script: LONG_SCRIPT,
        settings: { ...BASE_SETTINGS, adaptiveEnabled: false, adaptiveAutoSync: false },
      },
    );

    let getUserMediaCalls = 0;
    await page.addInitScript(() => {
      const media = navigator.mediaDevices;
      if (!media) {
        return;
      }
      const original = media.getUserMedia.bind(media);
      media.getUserMedia = async (...args) => {
        getUserMediaCalls += 1;
        return original(...args);
      };
    });

    await page.goto("/play");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("player-mic-sync")).toHaveCount(0);
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    expect(getUserMediaCalls).toBe(0);
  });

  test("shows mic and toggles sync when adaptive enabled (R20–R21)", async ({
    page,
    context,
  }) => {
    await context.addInitScript(
      ({ script, settings }) => {
        localStorage.setItem("tp:script:source", script);
        localStorage.setItem("tp:script:format", "plain");
        localStorage.setItem("tp:settings", JSON.stringify(settings));
      },
      {
        script: LONG_SCRIPT,
        settings: { ...BASE_SETTINGS, adaptiveEnabled: true, adaptiveAutoSync: false },
      },
    );

    await page.goto("/play");
    await page.waitForLoadState("networkidle");

    const mic = page.getByTestId("player-mic-sync");
    await expect(mic).toBeVisible();
    await expect(mic).toHaveAttribute("aria-pressed", "false");

    await mic.click();
    await expect(mic).toHaveAttribute("aria-pressed", "true");
  });

  test("shows permission hint when mic denied (R23)", async ({ page, context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => {
            throw new DOMException("denied", "NotAllowedError");
          },
        },
      });
    });

    await context.addInitScript(
      ({ script, settings }) => {
        localStorage.setItem("tp:script:source", script);
        localStorage.setItem("tp:script:format", "plain");
        localStorage.setItem("tp:settings", JSON.stringify(settings));
      },
      {
        script: LONG_SCRIPT,
        settings: { ...BASE_SETTINGS, adaptiveEnabled: true, adaptiveAutoSync: false },
      },
    );

    await page.goto("/play");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("player-mic-sync").click();
    await expect(page.getByTestId("player-mic-denied-hint")).toContainText(
      /microphone access was denied/i,
    );
  });

  test("auto-sync activates mic when play starts (R22)", async ({ page, context }) => {
    await context.addInitScript(
      ({ script, settings }) => {
        localStorage.setItem("tp:script:source", script);
        localStorage.setItem("tp:script:format", "plain");
        localStorage.setItem("tp:settings", JSON.stringify(settings));
      },
      {
        script: LONG_SCRIPT,
        settings: { ...BASE_SETTINGS, adaptiveEnabled: true, adaptiveAutoSync: true },
      },
    );

    await page.goto("/play");
    await page.waitForLoadState("networkidle");

    const mic = page.getByTestId("player-mic-sync");
    await expect(mic).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: "Play" }).click();
    await expect(mic).toHaveAttribute("aria-pressed", "true");
  });
});
