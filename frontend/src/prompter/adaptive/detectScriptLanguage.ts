import type { ParsedScriptLine } from "./parseScriptLines";

const SPANISH_STOPWORDS = new Set([
  "que", "los", "las", "del", "por", "con", "una", "para", "como", "pero",
  "sus", "les", "mas", "esto", "esta", "eso", "esa", "ellos", "ellas",
  "cuando", "donde", "porque", "aunque", "tambien", "despues", "antes",
  "hasta", "desde", "hacia", "sobre", "entre", "segun", "durante",
  "todo", "todos", "toda", "todas", "cada", "otro", "otra", "otros",
  "hay", "ser", "fue", "han", "sido", "esta", "estan", "era", "eran",
  "tiene", "tienen", "hacer", "hecho", "ver", "voy", "vamos",
]);

/** Infer language from script body — ignores page `html lang` when content is clear. */
export function inferLanguageFromScriptText(text: string): string | null {
  if (text.length < 20) {
    return null;
  }

  const spanishChars = (text.match(/[ñáéíóúü¡¿]/gi) ?? []).length;
  if (spanishChars >= 2 || spanishChars / text.length > 0.003) {
    return "es";
  }

  const words = text.toLowerCase().replace(/[^a-záéíóúüñ\s]/g, " ").split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  if (totalWords >= 20) {
    const spanishWordCount = words.filter((word) => SPANISH_STOPWORDS.has(word)).length;
    if (spanishWordCount / totalWords >= 0.04) {
      return "es";
    }
  }

  return null;
}

export function detectScriptLanguage(parsedLines: ParsedScriptLine[]): string {
  const text = parsedLines.map((line) => line.text).join(" ");
  const fromScript = inferLanguageFromScriptText(text);
  if (fromScript) {
    return fromScript;
  }

  const htmlLang = document.documentElement.lang?.trim();
  if (htmlLang) {
    return htmlLang;
  }

  return navigator.language || "en";
}

function browserLanguageBase(): string {
  if (typeof navigator === "undefined") {
    return "en";
  }
  const nav = navigator.language?.trim();
  if (!nav) {
    return "en";
  }
  return nav.split("-")[0] || "en";
}

/** Short label for the player sync button (e.g. es-ES → ES). Never returns AUTO. */
export function formatRecognitionLanguageLabel(lang: string): string {
  const trimmed = lang.trim();
  const base = (trimmed ? trimmed.split("-")[0] : browserLanguageBase()) || "en";
  return base.toUpperCase();
}

/** BCP-47 tags to try for speech recognition, derived from script language. */
export function buildRecognitionLangCandidates(primary: string): string[] {
  const base = primary.split("-")[0]?.toLowerCase() || "en";
  const regional =
    base === "es" ? "es-ES" : base === "en" ? "en-US" : primary;
  const candidates: string[] = [];
  for (const lang of [regional, primary, base]) {
    if (lang && !candidates.includes(lang)) {
      candidates.push(lang);
    }
  }
  return candidates;
}
