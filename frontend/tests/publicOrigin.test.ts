import { describe, expect, it, vi } from "vitest";

import { resolveHandoffOrigin } from "../src/pairing/publicOrigin";
import { maxCompressedBytesForHandoffQr, QR_MAX_URL_CHARS } from "../src/pairing/qrConstants";
import { buildHandoffReceiveUrl, encodeHandoffFragment } from "../src/pairing/qrEncode";
import { fitsQrHandoff } from "../src/pairing/qrThreshold";

describe("resolveHandoffOrigin", () => {
  it("uses VITE_PUBLIC_ORIGIN when set", () => {
    vi.stubEnv("VITE_PUBLIC_ORIGIN", "http://10.42.0.1:9173");
    vi.stubEnv("VITE_PUBLIC_HOST", "");
    expect(resolveHandoffOrigin("http://localhost:9080")).toBe("http://10.42.0.1:9173");
    vi.unstubAllEnvs();
  });

  it("builds origin from VITE_PUBLIC_HOST and port", () => {
    vi.stubEnv("VITE_PUBLIC_ORIGIN", "");
    vi.stubEnv("VITE_PUBLIC_HOST", "10.42.0.1");
    vi.stubEnv("VITE_PUBLIC_PORT", "9173");
    expect(resolveHandoffOrigin("http://localhost:9080")).toBe("http://10.42.0.1:9173");
    vi.unstubAllEnvs();
  });

  it("falls back to window origin", () => {
    vi.stubEnv("VITE_PUBLIC_ORIGIN", "");
    vi.stubEnv("VITE_PUBLIC_HOST", "");
    expect(resolveHandoffOrigin("http://localhost:9080")).toBe("http://localhost:9080");
    vi.unstubAllEnvs();
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
