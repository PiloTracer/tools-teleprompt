import { useEffect, useRef, useState } from "react";

import { matchTranscriptToLine, tokenize } from "./matchScriptLine";
import type { ParsedScriptLine } from "./types";

/** Words retained in the rolling match buffer. */
const WORD_BUFFER_SIZE = 25;

/** Words from the tail of the buffer used for each match attempt. */
const MATCH_WINDOW_WORDS = 8;

/** After this many ms of no new transcript, reading line resets to null (silence). */
const SILENCE_TIMEOUT_MS = 1800;

/**
 * After this many consecutive SR results with no script match, restart
 * recognition with the next language candidate.  This lets the system
 * self-correct when the script language doesn't match the browser language.
 */
const LANG_RETRY_UNMATCHED_THRESHOLD = 6;

/**
 * Ordered list of language fallbacks tried when matching fails.
 * Populated at runtime so navigator.language is always evaluated fresh.
 */
function buildLangCandidates(primary: string): string[] {
  const nav = navigator.language || "";
  const candidates: string[] = [];
  // primary (detected from script) first, then browser lang, then hard-coded
  // Spanish (common use-case), then browser default.
  for (const lang of [primary, nav, "es", "es-ES", ""]) {
    if (!candidates.includes(lang)) {
      candidates.push(lang);
    }
  }
  return candidates;
}

export type SpeechTrackerError =
  | "permission_denied"
  | "not_supported"
  | "network"
  | "pipeline_error";

export type UseSpeechTrackerOptions = {
  /** Master enable gate — when false, no mic access is requested. */
  enabled: boolean;
  /** Open the mic and run recognition when true. */
  listen: boolean;
  /** Parsed script lines used for matching. */
  parsedLines: ParsedScriptLine[];
};

export type UseSpeechTrackerResult = {
  /** True if SpeechRecognition is available in this browser. */
  supported: boolean;
  /** True while recognition is open and receiving audio. */
  active: boolean;
  /**
   * Index of the script line currently being read, or null when silent.
   * Updated on every recognition result event.
   */
  readingLineIndex: number | null;
  /**
   * True once the first successful line match has been made this session.
   * False at cold-start (user hasn't spoken yet after sync engaged).
   * Used to distinguish "haven't spoken yet" from "paused after speaking"
   * so the scroll doesn't hold on the very first frame.
   */
  hasCalibrated: boolean;
  permissionDenied: boolean;
  error: SpeechTrackerError | null;
};

/**
 * High-frequency Spanish stopwords (closed-class) that are strong language
 * signals even without accented characters.
 */
const SPANISH_STOPWORDS = new Set([
  "que", "los", "las", "del", "por", "con", "una", "para", "como", "pero",
  "sus", "les", "más", "esto", "esta", "eso", "esa", "ellos", "ellas",
  "cuando", "donde", "porque", "aunque", "también", "después", "antes",
  "hasta", "desde", "hacia", "sobre", "entre", "según", "durante",
  "todo", "todos", "toda", "todas", "cada", "otro", "otra", "otros",
  "hay", "ser", "fue", "han", "sido", "está", "están", "era", "eran",
  "tiene", "tienen", "hacer", "hecho", "ver", "voy", "vamos",
]);

/**
 * Heuristically detects the dominant language of the script so the recogniser
 * can be configured to match what the user is actually saying.
 *
 * Strategy (in order of confidence):
 *   1. HTML lang attribute on <html> — set by the app/page explicitly.
 *   2. Spanish-specific characters (ñ ¡ ¿ á é í ó ú ü) — strong signal.
 *   3. High-frequency Spanish stopwords — catches plain-ASCII Spanish scripts.
 *   4. `navigator.language` — browser UI language as last resort.
 *
 * Returns a BCP 47 tag ("es", "en", etc.) or empty string (browser default).
 */
export function detectScriptLanguage(parsedLines: ParsedScriptLine[]): string {
  // Trust an explicit HTML lang attribute over everything else.
  const htmlLang = document.documentElement.lang?.trim();
  if (htmlLang) {
    return htmlLang;
  }

  const text = parsedLines.map((l) => l.text).join(" ");
  if (text.length < 20) {
    return navigator.language || "";
  }

  // Strong signal: Spanish-specific Unicode characters.
  const spanishChars = (text.match(/[ñáéíóúü¡¿]/gi) ?? []).length;
  if (spanishChars >= 2 || spanishChars / text.length > 0.003) {
    return "es";
  }

  // Weaker signal: count Spanish stopwords in the tokenised script.
  const words = text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/);
  const totalWords = words.length;
  if (totalWords >= 20) {
    const spanishWordCount = words.filter((w) => SPANISH_STOPWORDS.has(w)).length;
    if (spanishWordCount / totalWords >= 0.04) {
      return "es";
    }
  }

  return navigator.language || "";
}

/** Returns true when the browser exposes SpeechRecognition or its webkit prefix. */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const w = window as unknown as Record<string, unknown>;
  return (
    typeof w["SpeechRecognition"] === "function" ||
    typeof w["webkitSpeechRecognition"] === "function"
  );
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") {
    return null;
  }
  const w = window as unknown as Record<string, unknown>;
  const Ctor =
    (w["SpeechRecognition"] as (new () => SpeechRecognition) | undefined) ??
    (w["webkitSpeechRecognition"] as (new () => SpeechRecognition) | undefined);
  return Ctor ?? null;
}

/**
 * Continuous speech-to-script tracker.
 *
 * Uses the browser SpeechRecognition API (Chrome / Edge) to transcribe the
 * reader's voice in real time, then fuzzy-matches the transcript against the
 * loaded script to determine which line is currently being read.
 *
 * Audio is processed locally by the browser engine; the transcript is sent to
 * the browser vendor's recognition service (Google for Chrome / Microsoft for
 * Edge). No audio or transcript leaves the device in any other way.
 */
export function useSpeechTracker({
  enabled,
  listen,
  parsedLines,
}: UseSpeechTrackerOptions): UseSpeechTrackerResult {
  const supported = isSpeechRecognitionSupported();

  const [active, setActive] = useState(false);
  const [readingLineIndex, setReadingLineIndex] = useState<number | null>(null);
  const [hasCalibrated, setHasCalibrated] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<SpeechTrackerError | null>(null);

  const cursorLineRef = useRef(0);
  const calibratedRef = useRef(false);
  const wordBufferRef = useRef<string[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldRunRef = useRef(false);
  const permissionDeniedRef = useRef(false);
  const parsedLinesRef = useRef(parsedLines);
  parsedLinesRef.current = parsedLines;

  useEffect(() => {
    if (!enabled || !listen || !supported) {
      shouldRunRef.current = false;
      if (silenceTimerRef.current !== null) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setActive(false);
      setReadingLineIndex(null);
      setHasCalibrated(false);
      calibratedRef.current = false;
      cursorLineRef.current = 0;
      if (!enabled) {
        setPermissionDenied(false);
        permissionDeniedRef.current = false;
        setError(null);
      }
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("not_supported");
      return;
    }

    let cancelled = false;
    shouldRunRef.current = true;
    cursorLineRef.current = 0;
    wordBufferRef.current = [];

    // Build the ordered list of language candidates to try.
    const detectedLang = detectScriptLanguage(parsedLinesRef.current);
    const langCandidates = buildLangCandidates(detectedLang);
    console.log("[SR] language candidates", {
      detected: detectedLang,
      candidates: langCandidates,
      scriptLines: parsedLinesRef.current.length,
    });
    let langIndex = 0;
    // Tracks consecutive unmatched results in the current language attempt.
    let unmatchedCount = 0;
    // Set to true when onend should restart with the NEXT language candidate.
    let retryWithNextLang = false;

    const startRecognition = (): SpeechRecognition => {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = langCandidates[langIndex] ?? "";
      console.log("[SR] starting recognition", { lang: rec.lang, langIndex });

      const armSilenceTimer = () => {
        if (silenceTimerRef.current !== null) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          if (!cancelled) {
            setReadingLineIndex(null);
          }
        }, SILENCE_TIMEOUT_MS);
      };

      rec.onstart = () => {
        if (cancelled) return;
        setActive(true);
        setError(null);
      };

      rec.onresult = (event: SpeechRecognitionEvent) => {
        if (cancelled) return;

        let finalText = "";
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript + " ";
          } else {
            interimText += result[0].transcript + " ";
          }
        }

        if (finalText.trim()) {
          const newWords = tokenize(finalText);
          wordBufferRef.current = [...wordBufferRef.current, ...newWords].slice(-WORD_BUFFER_SIZE);
        }

        const wordsToMatch =
          wordBufferRef.current.length > 0
            ? wordBufferRef.current.slice(-MATCH_WINDOW_WORDS)
            : tokenize(interimText).slice(-MATCH_WINDOW_WORDS);

        if (wordsToMatch.length > 0) {
          const matched = matchTranscriptToLine(
            wordsToMatch,
            parsedLinesRef.current,
            cursorLineRef.current,
            calibratedRef.current ? 6 : Math.max(14, parsedLinesRef.current.length),
            calibratedRef.current ? 6 : 3,
          );

          console.log("[SR] result", {
            final: finalText.trim(),
            interim: interimText.trim(),
            words: wordsToMatch,
            cursor: cursorLineRef.current,
            matched,
            lang: rec.lang,
          });

          if (matched !== null) {
            calibratedRef.current = true;
            unmatchedCount = 0;
            cursorLineRef.current = matched;
            setReadingLineIndex(matched);
            setHasCalibrated(true);
          } else {
            unmatchedCount += 1;
            // Too many misses — language is probably wrong; try the next candidate.
            if (
              unmatchedCount >= LANG_RETRY_UNMATCHED_THRESHOLD &&
              langIndex + 1 < langCandidates.length
            ) {
              langIndex += 1;
              unmatchedCount = 0;
              wordBufferRef.current = []; // clear buffer so stale words don't pollute new lang
              retryWithNextLang = true;
              try {
                rec.stop(); // onend will restart with new lang
              } catch {
                // ignore
              }
            }
          }
          armSilenceTimer();
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (cancelled) return;
        console.warn("[SR] error", { error: event.error, lang: rec.lang });
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          permissionDeniedRef.current = true;
          setPermissionDenied(true);
          setError("permission_denied");
          setActive(false);
          shouldRunRef.current = false;
        } else if (event.error === "network") {
          setError("network");
        }
      };

      rec.onend = () => {
        if (cancelled) return;
        setActive(false);
        if (!shouldRunRef.current || permissionDeniedRef.current) return;

        if (retryWithNextLang) {
          retryWithNextLang = false;
          // Replace the recognition instance with a new one at the next lang.
          currentRecognition = startRecognition();
          return;
        }

        // Normal restart to keep continuous recognition alive.
        try {
          rec.start();
        } catch {
          // Transient restart error — ignore.
        }
      };

      try {
        rec.start();
      } catch {
        if (!cancelled) setError("pipeline_error");
      }

      return rec;
    };

    let currentRecognition = startRecognition();

    return () => {
      cancelled = true;
      shouldRunRef.current = false;
      calibratedRef.current = false;
      cursorLineRef.current = 0;
      if (silenceTimerRef.current !== null) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setActive(false);
      setReadingLineIndex(null);
      setHasCalibrated(false);
      try {
        currentRecognition.stop();
      } catch {
        // Ignore stop errors on cleanup.
      }
    };
  }, [enabled, listen, supported]);

  return { supported, active, readingLineIndex, hasCalibrated, permissionDenied, error };
}
