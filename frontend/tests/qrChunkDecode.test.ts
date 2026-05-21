import { afterEach, describe, expect, it } from "vitest";

import { encodeMultiQrHandoff } from "../src/pairing/qrChunkEncode";
import { ingestMultiQrFragment } from "../src/pairing/qrChunkDecode";

const ORIGIN = "http://127.0.0.1:4173";

function hashFromHandoffUrl(handoffUrl: string): string {
  const hashIndex = handoffUrl.indexOf("#");
  return hashIndex >= 0 ? handoffUrl.slice(hashIndex) : "";
}

function buildMultiScript(): string {
  return (
    "Multi-QR unit test marker\n" +
    Array.from({ length: 700 }, () => crypto.randomUUID()).join("\n")
  );
}

afterEach(() => {
  localStorage.clear();
});

describe("ingestMultiQrFragment", () => {
  it("accumulates chunks across separate storage contexts (new-tab scans)", async () => {
    const chunks = await encodeMultiQrHandoff(buildMultiScript(), "plain", ORIGIN);
    expect(chunks.length).toBeGreaterThan(1);

    const first = await ingestMultiQrFragment(hashFromHandoffUrl(chunks[0]!.handoffUrl));
    expect(first).toMatchObject({
      status: "pending",
      received: 1,
      total: chunks.length,
    });

    const second = await ingestMultiQrFragment(hashFromHandoffUrl(chunks[1]!.handoffUrl));
    expect(second).toMatchObject({
      status: "pending",
      received: 2,
      total: chunks.length,
    });
  });

  it("reassembles the full script when all chunks were ingested", async () => {
    const script = buildMultiScript();
    const chunks = await encodeMultiQrHandoff(script, "plain", ORIGIN);

    for (let index = 0; index < chunks.length - 1; index += 1) {
      const result = await ingestMultiQrFragment(hashFromHandoffUrl(chunks[index]!.handoffUrl));
      expect(result?.status).toBe("pending");
    }

    const complete = await ingestMultiQrFragment(
      hashFromHandoffUrl(chunks[chunks.length - 1]!.handoffUrl),
    );
    expect(complete?.status).toBe("complete");
    if (complete?.status === "complete") {
      expect(complete.payload.s).toContain("Multi-QR unit test marker");
    }
  });
});
