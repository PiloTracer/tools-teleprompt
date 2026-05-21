import type { ScriptFormat } from "../markdown/types";
import { scriptByteLength } from "../prompter/limits";
import {
  maxCompressedBytesForHandoffQr,
  maxMultiQrChunkBytes,
  multiHandoffUrlLength,
  QR_FRAGMENT_THRESHOLD_BYTES,
  QR_MAX_URL_CHARS,
} from "./qrConstants";

export { QR_FRAGMENT_THRESHOLD_BYTES } from "./qrConstants";

export const HANDOFF_PAYLOAD_VERSION = 1 as const;

export type HandoffMode = "single-qr" | "multi-qr" | "lan" | "relay";

export type HandoffPayload = {
  v: typeof HANDOFF_PAYLOAD_VERSION;
  f: ScriptFormat;
  s: string;
};

export function buildHandoffPayload(source: string, format: ScriptFormat): HandoffPayload {
  return { v: HANDOFF_PAYLOAD_VERSION, f: format, s: source };
}

export function serializeHandoffPayload(payload: HandoffPayload): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload));
}

export function compressionSupported(): boolean {
  return typeof CompressionStream !== "undefined";
}

export async function compressBytes(input: Uint8Array): Promise<Uint8Array> {
  if (!compressionSupported()) {
    throw new Error("CompressionStream is not available");
  }
  if (typeof Blob !== "undefined" && typeof Blob.prototype.stream === "function") {
    const stream = new Blob([input]).stream().pipeThrough(new CompressionStream("deflate"));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  }
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  await writer.write(input);
  await writer.close();
  const buffer = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buffer);
}

export async function measureCompressedHandoffSize(
  source: string,
  format: ScriptFormat,
): Promise<number> {
  const payload = buildHandoffPayload(source, format);
  const raw = serializeHandoffPayload(payload);
  const compressed = await compressBytes(raw);
  return compressed.byteLength;
}

export async function fitsQrHandoff(
  source: string,
  format: ScriptFormat,
  origin?: string,
): Promise<boolean> {
  if (!source.trim()) {
    return false;
  }
  if (!compressionSupported()) {
    return false;
  }
  try {
    const size = await measureCompressedHandoffSize(source, format);
    if (size > QR_FRAGMENT_THRESHOLD_BYTES) {
      return false;
    }
    if (origin) {
      const qrMax = maxCompressedBytesForHandoffQr(origin);
      if (size > qrMax) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function fitsMultiQrHandoff(
  source: string,
  format: ScriptFormat,
  origin: string,
  maxScriptBytes: number,
): Promise<boolean> {
  if (!source.trim() || scriptByteLength(source) > maxScriptBytes) {
    return false;
  }
  if (!compressionSupported()) {
    return false;
  }
  try {
    const payload = buildHandoffPayload(source, format);
    const compressed = await compressBytes(serializeHandoffPayload(payload));
    const singleMax = maxCompressedBytesForHandoffQr(origin);
    if (compressed.byteLength <= singleMax) {
      return false;
    }
    const chunkSize = maxMultiQrChunkBytes(origin);
    if (chunkSize <= 0) {
      return false;
    }
    const sessionId = "xxxxxxxx";
    const total = Math.max(1, Math.ceil(compressed.byteLength / chunkSize));
    for (let index = 1; index <= total; index += 1) {
      const start = (index - 1) * chunkSize;
      const chunk = compressed.slice(start, start + chunkSize);
      if (multiHandoffUrlLength(origin, sessionId, index, total, chunk.byteLength) > QR_MAX_URL_CHARS) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Fallback order: single QR → multi-QR → LAN → relay (ADR 006).
 */
export async function resolveHandoffMode(
  source: string,
  format: ScriptFormat,
  origin: string,
  maxScriptBytes: number,
): Promise<HandoffMode> {
  if (!source.trim()) {
    return "relay";
  }
  if (scriptByteLength(source) > maxScriptBytes) {
    return "relay";
  }
  if (!compressionSupported()) {
    return "lan";
  }
  if (await fitsQrHandoff(source, format, origin)) {
    return "single-qr";
  }
  if (await fitsMultiQrHandoff(source, format, origin, maxScriptBytes)) {
    return "multi-qr";
  }
  return "lan";
}
