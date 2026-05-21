export const DEFAULT_MAX_SCRIPT_BYTES = 262_144;

export const ACCEPTED_EXTENSIONS = [".txt", ".md"] as const;

export function isAcceptedFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function scriptByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function validateScriptSize(
  text: string,
  maxBytes = DEFAULT_MAX_SCRIPT_BYTES,
): { ok: true } | { ok: false; message: string } {
  const bytes = scriptByteLength(text);
  if (bytes > maxBytes) {
    const kb = Math.round(maxBytes / 1024);
    return {
      ok: false,
      message: `Script is too large (${bytes} bytes). Maximum is ${kb} KB.`,
    };
  }
  return { ok: true };
}
