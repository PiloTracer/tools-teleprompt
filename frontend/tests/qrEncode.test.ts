import { describe, expect, it } from "vitest";

import {
  generateHandoffQrDataUrl,
  QR_EC_M_MAX_URL_CHARS,
  QR_RENDER_MARGIN,
  resolveQrErrorCorrectionLevel,
} from "../src/pairing/qrEncode";
import { QR_MAX_URL_CHARS } from "../src/pairing/qrConstants";

describe("resolveQrErrorCorrectionLevel", () => {
  it("uses M for shorter URLs", () => {
    expect(resolveQrErrorCorrectionLevel(100)).toBe("M");
    expect(resolveQrErrorCorrectionLevel(QR_EC_M_MAX_URL_CHARS)).toBe("M");
  });

  it("uses L for URLs near capacity", () => {
    expect(resolveQrErrorCorrectionLevel(QR_EC_M_MAX_URL_CHARS + 1)).toBe("L");
    expect(resolveQrErrorCorrectionLevel(QR_MAX_URL_CHARS)).toBe("L");
  });
});

describe("generateHandoffQrDataUrl", () => {
  it("returns SVG data URL with quiet margin for scan reliability", async () => {
    const url = "http://127.0.0.1:9173/handoff/receive#tp=v1.YWJj";
    const dataUrl = await generateHandoffQrDataUrl(url);
    expect(dataUrl.startsWith("data:image/svg+xml")).toBe(true);
    const decoded = decodeURIComponent(dataUrl.replace(/^data:image\/svg\+xml;charset=utf-8,/, ""));
    expect(decoded).toContain("<svg");
    expect(decoded.length).toBeGreaterThan(100);
    expect(QR_RENDER_MARGIN).toBe(4);
  });
});
