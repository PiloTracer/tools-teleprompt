/**
 * QR handoff size limits (D14 — decision 20260521-full-plan.md)
 *
 * Two independent limits apply to serverless QR handoff:
 *
 * 1. **Fragment threshold** (`QR_FRAGMENT_THRESHOLD_BYTES`, 8192 B compressed)
 *    — Fast heuristic from foundation U8 / A21. Scripts above this skip single-QR
 *    mode detection early. Does NOT guarantee the final URL fits in a QR symbol.
 *
 * 2. **QR encode capacity** (`QR_MAX_URL_CHARS`, 2900 chars — byte mode at EC level L)
 *    — Hard limit on the full handoff URL (`origin + path + #fragment`). The qrcode
 *    library auto-detects byte mode because handoff URLs contain lowercase letters
 *    (scheme, hostname, path, base64url fragment); alphanumeric mode (~3391 chars) is
 *    not reachable without case-insensitive URLs. EC level **M** is used when the URL
 *    is short enough (~≤2200 chars) for better phone-camera scans; otherwise **L**.
 *    Mode detection MUST use {@link maxCompressedBytesForHandoffQr}
 *    and {@link maxMultiQrChunkBytes} derived from this value and `PUBLIC_ORIGIN` length.
 *
 * **Why both?** A script can compress to < 8192 B yet produce a URL longer than 2900 chars
 * (long hotspot hostname, low compressibility). Symptom: “Could not generate QR handoff”.
 * Fix: set `PUBLIC_ORIGIN` in `.env.dev` (see `.env.example`).
 *
 * Fallback when single-QR fails: multi-QR → LAN → relay (see `resolveHandoffMode`).
 */

/** URL path for single-QR fragment consumption (SPA route). */
export const HANDOFF_RECEIVE_PATH = "/handoff/receive";

/** URL path for multi-QR fragment consumption (SPA route). */
export const MULTI_HANDOFF_RECEIVE_PATH = "/handoff/multi";

/** Single-QR fragment prefix: `#tp=v1.<base64url(deflate(json))>` */
export const HANDOFF_FRAGMENT_PREFIX = "tp=v1.";

/** Multi-QR fragment prefix: `#tp=m1.{id}.{index}.{total}.{base64url(chunk)}` */
export const MULTI_HANDOFF_FRAGMENT_PREFIX = "tp=m1.";

/**
 * Max compressed fragment payload (bytes) for mode heuristics (plan U8 / A21).
 * Single-QR may still fail QR symbol encoding below this when URL length exceeds
 * {@link QR_MAX_URL_CHARS} — see {@link maxCompressedBytesForHandoffQr}.
 */
export const QR_FRAGMENT_THRESHOLD_BYTES = 8192;

/**
 * Max handoff URL length encodable in a QR symbol at error correction L, byte mode.
 * Lowercase letters in URLs (scheme, host, path, base64url fragment) force qrcode
 * into byte mode; alphanumeric-mode capacity (~3391) is not usable in practice.
 * Applies to single-QR and each multi-QR chunk URL.
 */
export const QR_MAX_URL_CHARS = 2900;

/**
 * Prefer URLs at or below this size when possible so QR codes can use EC level M
 * and lower module density (better phone-camera reliability on screens).
 */
export const QR_EC_M_PREFERRED_MAX_URL_CHARS = 2200;

export function handoffReceiveUrlLength(origin: string, fragment: string): number {
  const base = origin.replace(/\/$/, "");
  return `${base}${HANDOFF_RECEIVE_PATH}#${fragment}`.length;
}

/** Upper bound on compressed payload bytes that fit in one single-QR at the given origin. */
export function maxCompressedBytesForHandoffQr(origin: string): number {
  const overhead =
    origin.replace(/\/$/, "").length +
    HANDOFF_RECEIVE_PATH.length +
    1 +
    HANDOFF_FRAGMENT_PREFIX.length;
  const maxB64Chars = QR_MAX_URL_CHARS - overhead;
  if (maxB64Chars <= 0) {
    return 0;
  }
  return Math.floor((maxB64Chars * 3) / 4);
}

/** Conservative max raw chunk bytes so a multi-QR handoff URL fits in one QR symbol. */
export function maxMultiQrChunkBytes(origin: string): number {
  const base = origin.replace(/\/$/, "");
  const worstId = "xxxxxxxx";
  const worstIndex = 999;
  const worstTotal = 999;
  const prefix =
    `${base}${MULTI_HANDOFF_RECEIVE_PATH}#${MULTI_HANDOFF_FRAGMENT_PREFIX}` +
    `${worstId}.${worstIndex}.${worstTotal}.`;
  // Intentionally keep chunks below hard capacity to improve scan reliability.
  const targetUrlChars = Math.min(QR_EC_M_PREFERRED_MAX_URL_CHARS, QR_MAX_URL_CHARS);
  const maxB64Chars = targetUrlChars - prefix.length;
  if (maxB64Chars <= 0) {
    return 0;
  }
  return Math.floor((maxB64Chars * 3) / 4);
}

/** Estimated full multi-QR handoff URL length for a chunk of the given byte size. */
export function multiHandoffUrlLength(
  origin: string,
  sessionId: string,
  index: number,
  total: number,
  chunkByteLength: number,
): number {
  const base = origin.replace(/\/$/, "");
  const b64Chars = chunkByteLength === 0 ? 0 : Math.ceil((chunkByteLength * 4) / 3);
  return (
    base.length +
    MULTI_HANDOFF_RECEIVE_PATH.length +
    1 +
    MULTI_HANDOFF_FRAGMENT_PREFIX.length +
    sessionId.length +
    1 +
    String(index).length +
    1 +
    String(total).length +
    1 +
    b64Chars
  );
}
