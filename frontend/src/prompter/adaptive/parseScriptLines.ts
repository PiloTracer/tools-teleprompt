import type { LineKind } from "./types";
import { normalize, tokenize } from "./normalize";

/** Whole-line bracket tag, e.g. `[DATACARD]`. */
const BRACKET_TAG_LINE = /^\[[^\]]+\]$/;

/** Whole-line parenthetical direction, e.g. `(beat)`. */
const PAREN_DIRECTION_LINE = /^\(.+\)$/;

/** Whole-line C-style block comment. */
const BLOCK_COMMENT_LINE = /^\/\*[\s\S]*\*\/$/;

/** Markdown blockquote prefix, e.g. `> direction`. */
const BLOCKQUOTE_LINE = /^\s*>\s?/;

/** Italic stage direction, e.g. `*Mostrar tarjeta 4-5 segundos.*` */
const ITALIC_DIRECTION_LINE = /^\*[^*]+\*$/;

/** Pipe-separated metadata bullet, e.g. `11 skills | estándares | conceptos`. */
const PIPE_METADATA_LINE = /^[^|]+\|[^|]+(\|[^|]+)*$/;

/** Bracketed stage/section tags, e.g. `[SECCIÓN 2: ...]` or `[AUDIO SOLAMENTE: ...]`. */
const BRACKET_DIRECTION_LINE = /^\[[^\]]+\]/;

export function classifyScriptLine(line: string): LineKind {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return "spoken";
  }
  if (BRACKET_TAG_LINE.test(trimmed)) {
    return "meta";
  }
  if (BRACKET_DIRECTION_LINE.test(trimmed)) {
    return "meta";
  }
  if (PAREN_DIRECTION_LINE.test(trimmed)) {
    return "meta";
  }
  if (BLOCK_COMMENT_LINE.test(trimmed)) {
    return "meta";
  }
  if (BLOCKQUOTE_LINE.test(line)) {
    return "meta";
  }
  if (ITALIC_DIRECTION_LINE.test(trimmed)) {
    return "meta";
  }
  if (/^open\s+source:/i.test(trimmed)) {
    return "meta";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return "meta";
  }
  if (/^funciona\s+con:/i.test(trimmed)) {
    return "meta";
  }
  if (/^memoria\s+de\s+proyecto/i.test(trimmed)) {
    return "meta";
  }
  if (/^mostrar\s+tarjeta/i.test(trimmed)) {
    return "meta";
  }
  if (PIPE_METADATA_LINE.test(trimmed) && !/[.!?]$/.test(trimmed)) {
    return "meta";
  }
  return "spoken";
}

export type ParsedScriptLine = {
  index: number;
  text: string;
  kind: LineKind;
};

export function parseScriptLines(source: string): ParsedScriptLine[] {
  if (source.length === 0) {
    return [];
  }
  return source.split("\n").map((text, index) => ({
    index,
    text,
    kind: classifyScriptLine(text),
  }));
}

/** Normalized words that appear on meta lines but not on spoken lines — safe to skip during alignment. */
export function buildMetaOnlyWords(parsedLines: ParsedScriptLine[]): Set<string> {
  const spoken = new Set<string>();
  const meta = new Set<string>();
  for (const line of parsedLines) {
    const words = tokenize(line.text);
    const bucket = line.kind === "meta" ? meta : spoken;
    for (const word of words) {
      const normalized = normalize(word);
      if (normalized) {
        bucket.add(normalized);
      }
    }
  }
  const metaOnly = new Set<string>();
  for (const word of meta) {
    if (!spoken.has(word)) {
      metaOnly.add(word);
    }
  }
  return metaOnly;
}
