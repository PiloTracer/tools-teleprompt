/** Adaptive teleprompter — line classification (see adaptive-teleprompter SPEC §4). */

export type LineKind = "spoken" | "meta";

export type ParsedScriptLine = {
  index: number;
  text: string;
  kind: LineKind;
};
