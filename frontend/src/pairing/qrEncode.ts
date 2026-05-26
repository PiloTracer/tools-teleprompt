import QRCode from "qrcode";

import type { ScriptFormat } from "../markdown/types";
import {
  HANDOFF_FRAGMENT_PREFIX,
  HANDOFF_RECEIVE_PATH,
  handoffReceiveUrlLength,
  QR_EC_M_PREFERRED_MAX_URL_CHARS,
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

/** ISO quiet zone + screen-scan tuning (see deploy/README handoff tips). */
export const QR_RENDER_MARGIN = 4;

/** SVG scales crisply on any display size; PNG fallback uses this width. */
export const QR_RENDER_PNG_WIDTH = 1024;

export const QR_EC_M_MAX_URL_CHARS = QR_EC_M_PREFERRED_MAX_URL_CHARS;

export type QrErrorCorrectionLevel = "L" | "M";

/**
 * Prefer M (~15% recovery) for phone camera scans when the URL fits; L maximizes capacity.
 */
export function resolveQrErrorCorrectionLevel(urlLength: number): QrErrorCorrectionLevel {
  return urlLength <= QR_EC_M_MAX_URL_CHARS ? "M" : "L";
}

function qrColorOptions() {
  return {
    dark: "#000000",
    light: "#ffffff",
  } as const;
}

function svgMarkupToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function renderQrSvg(
  handoffUrl: string,
  errorCorrectionLevel: QrErrorCorrectionLevel,
): Promise<string> {
  return QRCode.toString(handoffUrl, {
    type: "svg",
    margin: QR_RENDER_MARGIN,
    errorCorrectionLevel,
    color: qrColorOptions(),
  });
}

export async function generateHandoffQrDataUrl(handoffUrl: string): Promise<string> {
  assertHandoffUrlFitsInQr(handoffUrl);
  const preferred = resolveQrErrorCorrectionLevel(handoffUrl.length);
  try {
    const svg = await renderQrSvg(handoffUrl, preferred);
    return svgMarkupToDataUrl(svg);
  } catch (firstErr) {
    if (preferred === "M") {
      try {
        const svg = await renderQrSvg(handoffUrl, "L");
        return svgMarkupToDataUrl(svg);
      } catch {
        /* fall through to PNG */
      }
    }
    try {
      return await QRCode.toDataURL(handoffUrl, {
        margin: QR_RENDER_MARGIN,
        width: QR_RENDER_PNG_WIDTH,
        errorCorrectionLevel: "L",
        color: qrColorOptions(),
      });
    } catch (pngErr) {
      const message =
        pngErr instanceof Error
          ? pngErr.message
          : firstErr instanceof Error
            ? firstErr.message
            : "QR encode failed";
      throw new QrGenerationError(message);
    }
  }
}

export function handoffUrlFitsInQr(origin: string, fragment: string): boolean {
  return handoffReceiveUrlLength(origin, fragment) <= QR_MAX_URL_CHARS;
}
