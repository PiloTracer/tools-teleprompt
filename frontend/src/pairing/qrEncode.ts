import QRCode from "qrcode";

import type { ScriptFormat } from "../markdown/types";
import {
  buildHandoffPayload,
  compressBytes,
  serializeHandoffPayload,
} from "./qrThreshold";

export const HANDOFF_FRAGMENT_PREFIX = "tp=v1.";
export const HANDOFF_RECEIVE_PATH = "/handoff/receive";

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
  return `${origin}${HANDOFF_RECEIVE_PATH}#${fragment}`;
}

export async function buildHandoffQrUrl(
  source: string,
  format: ScriptFormat,
  origin: string,
): Promise<string> {
  const fragment = await encodeHandoffFragment(source, format);
  return buildHandoffReceiveUrl(fragment, origin);
}

export async function generateHandoffQrDataUrl(handoffUrl: string): Promise<string> {
  return QRCode.toDataURL(handoffUrl, {
    margin: 2,
    width: 256,
    errorCorrectionLevel: "M",
  });
}
