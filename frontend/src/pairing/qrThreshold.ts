import type { ScriptFormat } from "../markdown/types";

/** Max compressed fragment payload (bytes). Plan default U8 / A21. */
export const QR_FRAGMENT_THRESHOLD_BYTES = 8192;

export const HANDOFF_PAYLOAD_VERSION = 1 as const;

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

export async function fitsQrHandoff(source: string, format: ScriptFormat): Promise<boolean> {
  if (!source.trim()) {
    return false;
  }
  if (!compressionSupported()) {
    return false;
  }
  try {
    const size = await measureCompressedHandoffSize(source, format);
    return size <= QR_FRAGMENT_THRESHOLD_BYTES;
  } catch {
    return false;
  }
}
