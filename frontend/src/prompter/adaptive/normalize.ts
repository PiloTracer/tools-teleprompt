const MAX_CACHE_SIZE = 2000;

let normalizeCache = new Map<string, string>();

/** Unicode-safe normalisation for fuzzy word matching. Results are memoized
 *  because the same script word is compared against many spoken words in a
 *  single matcher call, and spoken words are pre-normalised at the call site
 *  then re-normalised inside the match helpers. */
export function normalize(text: string): string {
  const cached = normalizeCache.get(text);
  if (cached !== undefined) {
    return cached;
  }
  const result = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  normalizeCache.set(text, result);
  if (normalizeCache.size > MAX_CACHE_SIZE) {
    normalizeCache = new Map<string, string>();
  }
  return result;
}

/** Drop the normalisation cache so stale entries from earlier in the session
 *  don't accumulate across SR restarts or long pauses. */
export function clearNormalizeCache(): void {
  normalizeCache = new Map<string, string>();
}

export function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}
