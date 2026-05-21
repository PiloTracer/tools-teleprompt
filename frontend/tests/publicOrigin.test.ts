import { afterEach, describe, expect, it, vi } from "vitest";

import {
  blocksCrossDeviceHandoff,
  resetHandoffOriginCache,
  resolveHandoffOrigin,
  resolveHandoffOriginAsync,
} from "../src/pairing/publicOrigin";
import { maxCompressedBytesForHandoffQr, QR_MAX_URL_CHARS } from "../src/pairing/qrConstants";
import { buildHandoffReceiveUrl, encodeHandoffFragment } from "../src/pairing/qrEncode";
import { fitsQrHandoff } from "../src/pairing/qrThreshold";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetHandoffOriginCache();
});

describe("resolveHandoffOrigin", () => {
  it("uses VITE_PUBLIC_ORIGIN when set", () => {
    vi.stubEnv("VITE_PUBLIC_ORIGIN", "http://10.42.0.1:9173");
    vi.stubEnv("VITE_PUBLIC_HOST", "");
    expect(resolveHandoffOrigin("http://localhost:9080")).toBe("http://10.42.0.1:9173");
  });

  it("builds origin from VITE_PUBLIC_HOST and port", () => {
    vi.stubEnv("VITE_PUBLIC_ORIGIN", "");
    vi.stubEnv("VITE_PUBLIC_HOST", "10.42.0.1");
    vi.stubEnv("VITE_PUBLIC_PORT", "9173");
    expect(resolveHandoffOrigin("http://localhost:9080")).toBe("http://10.42.0.1:9173");
  });

  it("ignores loopback VITE_PUBLIC_HOST and uses page LAN IP", () => {
    vi.stubEnv("VITE_PUBLIC_ORIGIN", "");
    vi.stubEnv("VITE_PUBLIC_HOST", "localhost");
    vi.stubEnv("VITE_PUBLIC_PORT", "9173");
    vi.stubGlobal("window", {
      location: {
        origin: "http://10.42.0.1:9080",
        hostname: "10.42.0.1",
        protocol: "http:",
        port: "9080",
      },
    });
    expect(resolveHandoffOrigin("http://localhost:9080")).toBe("http://10.42.0.1:9173");
  });

  it("falls back to window origin on loopback", async () => {
    vi.stubEnv("VITE_PUBLIC_ORIGIN", "");
    vi.stubEnv("VITE_PUBLIC_HOST", "");
    vi.stubEnv("VITE_DEV_HMR_HOST", "");
    vi.stubEnv("VITE_PUBLIC_PORT", "");
    vi.stubGlobal("window", {
      location: {
        origin: "http://localhost:9080",
        hostname: "localhost",
        protocol: "http:",
        port: "9080",
      },
    });
    vi.resetModules();
    const { resolveHandoffOrigin: resolve } = await import("../src/pairing/publicOrigin");
    expect(resolve("http://localhost:9080")).toBe("http://localhost:9080");
  });
});

describe("blocksCrossDeviceHandoff", () => {
  it("allows same-host loopback for preview/E2E", () => {
    vi.stubGlobal("window", {
      location: {
        hostname: "127.0.0.1",
        port: "4173",
        origin: "http://127.0.0.1:4173",
        protocol: "http:",
      },
    });
    expect(blocksCrossDeviceHandoff("http://127.0.0.1:4173")).toBe(false);
  });

  it("blocks loopback when host matches but port differs", () => {
    vi.stubGlobal("window", {
      location: {
        hostname: "localhost",
        port: "9080",
        origin: "http://localhost:9080",
        protocol: "http:",
      },
    });
    expect(blocksCrossDeviceHandoff("http://localhost:9173")).toBe(true);
  });
});

describe("resolveHandoffOriginAsync", () => {
  it("prefers API public-config over loopback build env", async () => {
    vi.stubEnv("VITE_PUBLIC_ORIGIN", "");
    vi.stubEnv("VITE_PUBLIC_HOST", "localhost");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ spa_public_origin: "http://10.42.0.1:9173" }),
      })),
    );

    await expect(resolveHandoffOriginAsync("http://localhost:9080")).resolves.toBe(
      "http://10.42.0.1:9173",
    );
  });
});

describe("QR capacity vs hotspot origin", () => {
  const hotspotOrigin = "http://10.42.0.1:9173";

  it("reserves URL headroom for LAN origin", () => {
    expect(maxCompressedBytesForHandoffQr(hotspotOrigin)).toBeGreaterThan(1000);
    expect(maxCompressedBytesForHandoffQr(hotspotOrigin)).toBeLessThan(8192);
  });

  it("fits small scripts for QR at hotspot origin", async () => {
    await expect(fitsQrHandoff("Hello from hotspot", "plain", hotspotOrigin)).resolves.toBe(
      true,
    );
  });

  it("builds receive URL on hotspot host", async () => {
    const fragment = await encodeHandoffFragment("Scan me", "plain");
    const url = buildHandoffReceiveUrl(fragment, hotspotOrigin);
    expect(url.startsWith("http://10.42.0.1:9173/handoff/receive#")).toBe(true);
    expect(url.length).toBeLessThanOrEqual(QR_MAX_URL_CHARS);
  });
});
