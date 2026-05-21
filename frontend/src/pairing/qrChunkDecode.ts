import type { ScriptFormat } from "../markdown/types";
import { MULTI_HANDOFF_FRAGMENT_PREFIX } from "./qrChunkEncode";
import { base64UrlToBytes, decompressBytes, HandoffDecodeError } from "./qrDecode";
import {
  HANDOFF_PAYLOAD_VERSION,
  type HandoffPayload,
} from "./qrThreshold";

const STORAGE_PREFIX = "teleprompt-multi-qr:";

export class MultiQrDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MultiQrDecodeError";
  }
}

export type MultiQrIngestResult =
  | { status: "complete"; payload: HandoffPayload }
  | { status: "pending"; sessionId: string; received: number; total: number };

type StoredMultiSession = {
  total: number;
  chunks: Record<string, string>;
};

type ParsedMultiFragment = {
  sessionId: string;
  index: number;
  total: number;
  encodedChunk: string;
};

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

function storageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`;
}

function loadSession(sessionId: string): StoredMultiSession | null {
  const raw = sessionStorage.getItem(storageKey(sessionId));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredMultiSession;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.total !== "number" ||
      typeof parsed.chunks !== "object" ||
      parsed.chunks === null
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(sessionId: string, session: StoredMultiSession): void {
  sessionStorage.setItem(storageKey(sessionId), JSON.stringify(session));
}

function clearSession(sessionId: string): void {
  sessionStorage.removeItem(storageKey(sessionId));
}

export function extractMultiFragmentPayload(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith(MULTI_HANDOFF_FRAGMENT_PREFIX)) {
    return null;
  }
  const payload = raw.slice(MULTI_HANDOFF_FRAGMENT_PREFIX.length);
  return payload.length > 0 ? payload : null;
}

export function parseMultiFragmentPayload(payload: string): ParsedMultiFragment {
  const match = payload.match(/^([A-Za-z0-9_-]+)\.(\d+)\.(\d+)\.([A-Za-z0-9_-]+)$/);
  if (!match) {
    throw new MultiQrDecodeError("Invalid multi-QR fragment shape");
  }

  const sessionId = match[1] ?? "";
  const index = Number.parseInt(match[2] ?? "", 10);
  const total = Number.parseInt(match[3] ?? "", 10);
  const encodedChunk = match[4] ?? "";

  if (
    !sessionId ||
    !Number.isFinite(index) ||
    !Number.isFinite(total) ||
    index < 1 ||
    total < 1 ||
    index > total
  ) {
    throw new MultiQrDecodeError("Invalid multi-QR fragment metadata");
  }

  try {
    base64UrlToBytes(encodedChunk);
  } catch {
    throw new MultiQrDecodeError("Invalid multi-QR chunk encoding");
  }

  return { sessionId, index, total, encodedChunk };
}

function countReceivedChunks(chunks: Record<string, string>, total: number): number {
  let count = 0;
  for (let i = 1; i <= total; i += 1) {
    if (chunks[String(i)]) {
      count += 1;
    }
  }
  return count;
}

function allChunksReceived(chunks: Record<string, string>, total: number): boolean {
  return countReceivedChunks(chunks, total) === total;
}

function concatChunks(chunks: Record<string, string>, total: number): Uint8Array {
  const parts: Uint8Array[] = [];
  let size = 0;
  for (let i = 1; i <= total; i += 1) {
    const encoded = chunks[String(i)];
    if (!encoded) {
      throw new MultiQrDecodeError(`Missing multi-QR chunk ${i} of ${total}`);
    }
    const bytes = base64UrlToBytes(encoded);
    parts.push(bytes);
    size += bytes.byteLength;
  }
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return merged;
}

async function decodeCompressedHandoff(compressed: Uint8Array): Promise<HandoffPayload> {
  const raw = await decompressBytes(compressed);
  const json = new TextDecoder().decode(raw);
  return parsePayloadJson(json);
}

export async function ingestMultiQrFragment(hash: string): Promise<MultiQrIngestResult | null> {
  const fragmentPayload = extractMultiFragmentPayload(hash);
  if (!fragmentPayload) {
    return null;
  }

  const parsed = parseMultiFragmentPayload(fragmentPayload);
  const existing = loadSession(parsed.sessionId);
  const session: StoredMultiSession = existing ?? {
    total: parsed.total,
    chunks: {},
  };

  if (session.total !== parsed.total) {
    throw new MultiQrDecodeError("Multi-QR session total mismatch");
  }

  session.chunks[String(parsed.index)] = parsed.encodedChunk;

  saveSession(parsed.sessionId, session);

  const received = countReceivedChunks(session.chunks, session.total);
  if (!allChunksReceived(session.chunks, session.total)) {
    return {
      status: "pending",
      sessionId: parsed.sessionId,
      received,
      total: session.total,
    };
  }

  try {
    const compressed = concatChunks(session.chunks, session.total);
    const payload = await decodeCompressedHandoff(compressed);
    clearSession(parsed.sessionId);
    return { status: "complete", payload };
  } catch (err) {
    clearSession(parsed.sessionId);
    if (err instanceof HandoffDecodeError || err instanceof MultiQrDecodeError) {
      throw err;
    }
    throw new MultiQrDecodeError("Could not reassemble multi-QR handoff");
  }
}

export function clearMultiQrSession(sessionId: string): void {
  clearSession(sessionId);
}
