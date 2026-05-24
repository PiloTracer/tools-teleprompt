import type { LineKind, ParsedScriptLine } from "./types";

/** Whole-line bracket tag, e.g. `[DATACARD]` or `[CARD: title]`. */
const BRACKET_TAG_LINE = /^\[[^\]]+\]$/;

/** Whole-line parenthetical direction, e.g. `(beat)`. */
const PAREN_DIRECTION_LINE = /^\(.+\)$/;

/** Whole-line C-style block comment (slash-star … star-slash). */
const BLOCK_COMMENT_LINE = /^\/\*[\s\S]*\*\/$/;

/** Markdown blockquote prefix, e.g. `> direction`. */
const BLOCKQUOTE_LINE = /^\s*>\s?/;

/**
 * Classify a single source line as spoken dialogue or meta markup.
 * Binding syntax: adaptive-teleprompter SPEC §4 markup table + amendment 01.
 */
export function classifyScriptLine(line: string): LineKind {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return "spoken";
  }
  if (BRACKET_TAG_LINE.test(trimmed)) {
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
  return "spoken";
}

/** True when a source line is meta markup (shared with markdown-render blockquote rules). */
export function isMetaSourceLine(line: string): boolean {
  return classifyScriptLine(line) === "meta";
}

/** Segment script source into ordered lines with classifications (SPEC R11–R12). */
export function parseScriptLines(source: string): ParsedScriptLine[] {
  if (source.length === 0) {
    return [];
  }
  const parts = source.split("\n");
  return parts.map((text, index) => ({
    index,
    text,
    kind: classifyScriptLine(text),
  }));
}
