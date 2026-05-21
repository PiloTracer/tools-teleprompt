import type { ScriptFormat } from "../markdown/types";
import { HANDOFF_FRAGMENT_PREFIX } from "./qrEncode";
import {
  HANDOFF_PAYLOAD_VERSION,
  type HandoffPayload,
} from "./qrThreshold";

export class HandoffDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HandoffDecodeError";
  }
}

export function base64UrlToBytes(encoded: string): Uint8Array {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function decompressionSupported(): boolean {
  return typeof DecompressionStream !== "undefined";
}

export async function decompressBytes(input: Uint8Array): Promise<Uint8Array> {
  if (!decompressionSupported()) {
    throw new HandoffDecodeError("DecompressionStream is not available");
  }
  if (typeof Blob !== "undefined" && typeof Blob.prototype.stream === "function") {
    const stream = new Blob([input]).stream().pipeThrough(new DecompressionStream("deflate"));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  }
  const ds = new DecompressionStream("deflate");
  const writer = ds.writable.getWriter();
  await writer.write(input);
  await writer.close();
  const buffer = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(buffer);
}

function isScriptFormat(value: unknown): value is ScriptFormat {
  return value === "plain" || value === "markdown";
}

function parsePayloadJson(json: string): HandoffPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new HandoffDecodeError("Invalid handoff payload JSON");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("v" in parsed) ||
    !("f" in parsed) ||
    !("s" in parsed)
  ) {
    throw new HandoffDecodeError("Invalid handoff payload shape");
  }

  const record = parsed as { v: unknown; f: unknown; s: unknown };
  if (record.v !== HANDOFF_PAYLOAD_VERSION) {
    throw new HandoffDecodeError("Unsupported handoff payload version");
  }
  if (!isScriptFormat(record.f)) {
    throw new HandoffDecodeError("Invalid script format in handoff payload");
  }
  if (typeof record.s !== "string") {
    throw new HandoffDecodeError("Invalid script source in handoff payload");
  }

  return {
    v: HANDOFF_PAYLOAD_VERSION,
    f: record.f,
    s: record.s,
  };
}

export function extractFragmentPayload(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith(HANDOFF_FRAGMENT_PREFIX)) {
    return null;
  }
  const payload = raw.slice(HANDOFF_FRAGMENT_PREFIX.length);
  return payload.length > 0 ? payload : null;
}

export async function decodeHandoffFragment(fragmentPayload: string): Promise<HandoffPayload> {
  let compressed: Uint8Array;
  try {
    compressed = base64UrlToBytes(fragmentPayload);
  } catch {
    throw new HandoffDecodeError("Invalid handoff fragment encoding");
  }

  const raw = await decompressBytes(compressed);
  const json = new TextDecoder().decode(raw);
  return parsePayloadJson(json);
}

export async function decodeHandoffFromHash(hash: string): Promise<HandoffPayload | null> {
  const fragmentPayload = extractFragmentPayload(hash);
  if (!fragmentPayload) {
    return null;
  }
  return decodeHandoffFragment(fragmentPayload);
}
