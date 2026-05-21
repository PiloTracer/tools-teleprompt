import QRCode from "qrcode";

import type { ScriptFormat } from "../markdown/types";
import {
  HANDOFF_FRAGMENT_PREFIX,
  HANDOFF_RECEIVE_PATH,
  handoffReceiveUrlLength,
  QR_MAX_URL_CHARS,
} from "./qrConstants";
import {
  buildHandoffPayload,
  compressBytes,
  serializeHandoffPayload,
} from "./qrThreshold";

export { HANDOFF_FRAGMENT_PREFIX, HANDOFF_RECEIVE_PATH } from "./qrConstants";

export class QrGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrGenerationError";
  }
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function encodeHandoffFragment(
  source: string,
  format: ScriptFormat,
): Promise<string> {
  const payload = buildHandoffPayload(source, format);
  const raw = serializeHandoffPayload(payload);
  const compressed = await compressBytes(raw);
  return HANDOFF_FRAGMENT_PREFIX + bytesToBase64Url(compressed);
}

export function buildHandoffReceiveUrl(fragment: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${HANDOFF_RECEIVE_PATH}#${fragment}`;
}

export function assertHandoffUrlFitsInQr(handoffUrl: string): void {
  if (handoffUrl.length > QR_MAX_URL_CHARS) {
    throw new QrGenerationError(
      `Handoff URL exceeds QR capacity (${handoffUrl.length} > ${QR_MAX_URL_CHARS} chars)`,
    );
  }
}

export async function buildHandoffQrUrl(
  source: string,
  format: ScriptFormat,
  origin: string,
): Promise<string> {
  const fragment = await encodeHandoffFragment(source, format);
  const handoffUrl = buildHandoffReceiveUrl(fragment, origin);
  assertHandoffUrlFitsInQr(handoffUrl);
  return handoffUrl;
}

export async function generateHandoffQrDataUrl(handoffUrl: string): Promise<string> {
  assertHandoffUrlFitsInQr(handoffUrl);
  try {
    return await QRCode.toDataURL(handoffUrl, {
      margin: 2,
      width: 256,
      errorCorrectionLevel: "M",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "QR encode failed";
    throw new QrGenerationError(message);
  }
}

export function handoffUrlFitsInQr(origin: string, fragment: string): boolean {
  return handoffReceiveUrlLength(origin, fragment) <= QR_MAX_URL_CHARS;
}
