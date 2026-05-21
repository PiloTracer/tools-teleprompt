import type { ScriptFormat } from "../markdown/types";
import {
  maxMultiQrChunkBytes,
  MULTI_HANDOFF_FRAGMENT_PREFIX,
  MULTI_HANDOFF_RECEIVE_PATH,
  QR_MAX_URL_CHARS,
} from "./qrConstants";
import { bytesToBase64Url, generateHandoffQrDataUrl, QrGenerationError } from "./qrEncode";
import {
  buildHandoffPayload,
  compressBytes,
  serializeHandoffPayload,
} from "./qrThreshold";

export { MULTI_HANDOFF_FRAGMENT_PREFIX, MULTI_HANDOFF_RECEIVE_PATH } from "./qrConstants";

export type MultiQrChunk = {
  sessionId: string;
  index: number;
  total: number;
  fragment: string;
  handoffUrl: string;
};

function randomSessionId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

function buildMultiFragment(
  sessionId: string,
  index: number,
  total: number,
  chunkBytes: Uint8Array,
): string {
  const encoded = bytesToBase64Url(chunkBytes);
  return `${MULTI_HANDOFF_FRAGMENT_PREFIX}${sessionId}.${index}.${total}.${encoded}`;
}

export function buildMultiHandoffReceiveUrl(
  fragment: string,
  origin: string,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${MULTI_HANDOFF_RECEIVE_PATH}#${fragment}`;
}

function chunkUrlLength(
  origin: string,
  sessionId: string,
  index: number,
  total: number,
  chunkBytes: Uint8Array,
): number {
  const fragment = buildMultiFragment(sessionId, index, total, chunkBytes);
  return buildMultiHandoffReceiveUrl(fragment, origin).length;
}

function assertChunkUrlFits(
  origin: string,
  sessionId: string,
  index: number,
  total: number,
  chunkBytes: Uint8Array,
): void {
  const length = chunkUrlLength(origin, sessionId, index, total, chunkBytes);
  if (length > QR_MAX_URL_CHARS) {
    throw new QrGenerationError(
      `Multi-QR chunk URL exceeds capacity (${length} > ${QR_MAX_URL_CHARS} chars)`,
    );
  }
}

function splitCompressedPayload(compressed: Uint8Array, chunkSize: number): Uint8Array[] {
  if (chunkSize <= 0) {
    throw new QrGenerationError("Cannot split handoff payload for multi-QR");
  }
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < compressed.length; offset += chunkSize) {
    chunks.push(compressed.slice(offset, offset + chunkSize));
  }
  return chunks.length > 0 ? chunks : [new Uint8Array(0)];
}

export async function encodeMultiQrHandoff(
  source: string,
  format: ScriptFormat,
  origin: string,
): Promise<MultiQrChunk[]> {
  const payload = buildHandoffPayload(source, format);
  const raw = serializeHandoffPayload(payload);
  const compressed = await compressBytes(raw);
  const chunkSize = maxMultiQrChunkBytes(origin);
  const byteChunks = splitCompressedPayload(compressed, chunkSize);
  const sessionId = randomSessionId();
  const total = byteChunks.length;

  return byteChunks.map((chunkBytes, offset) => {
    const index = offset + 1;
    assertChunkUrlFits(origin, sessionId, index, total, chunkBytes);
    const fragment = buildMultiFragment(sessionId, index, total, chunkBytes);
    return {
      sessionId,
      index,
      total,
      fragment,
      handoffUrl: buildMultiHandoffReceiveUrl(fragment, origin),
    };
  });
}

export async function generateMultiQrDataUrl(handoffUrl: string): Promise<string> {
  if (handoffUrl.length > QR_MAX_URL_CHARS) {
    throw new QrGenerationError(
      `Multi-QR URL exceeds capacity (${handoffUrl.length} > ${QR_MAX_URL_CHARS} chars)`,
    );
  }
  return generateHandoffQrDataUrl(handoffUrl);
}
