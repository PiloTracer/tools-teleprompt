import { useEffect, useRef, useState } from "react";

import {
  advanceRepeatedlyFromCursor,
  findInitialLock,
  matchRejectReason,
  shouldAcceptWordMatch,
} from "./matchScriptWords";
import { tokenize } from "./normalize";
import {
  buildRecognitionLangCandidates,
  detectScriptLanguage,
} from "./detectScriptLanguage";
import type { ParsedScriptLine } from "./parseScriptLines";
import { buildMetaOnlyWords } from "./parseScriptLines";
import { syncLog, syncLogBootOnce, syncLogOnChange, syncLogThrottled, syncWarn } from "./syncDebug";

const WORD_BUFFER_SIZE = 44;
const MATCH_WINDOW_WORDS = 20;
/** Interim SR words merged into the match window for faster live re-alignment. */
const INTERIM_TAIL_WORDS = 8;
const SILENCE_TIMEOUT_MS = 1800;
const LANG_RETRY_UNMATCHED_THRESHOLD = 8;

function buildLangCandidates(primary: string): string[] {
  return buildRecognitionLangCandidates(primary);
}

export type SpeechTrackerError =
  | "permission_denied"
  | "not_supported"
  | "network"
  | "pipeline_error";

export type UseSpeechTrackerOptions = {
  enabled: boolean;
  listen: boolean;
  scriptWords: string[];
  parsedLines: ParsedScriptLine[];
};

export type UseSpeechTrackerResult = {
  supported: boolean;
  active: boolean;
  readingWordIndex: number | null;
  hasCalibrated: boolean;
  recognitionLanguage: string | null;
  permissionDenied: boolean;
  error: SpeechTrackerError | null;
};

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

export function useSpeechTracker({
  enabled,
  listen,
  scriptWords,
  parsedLines,
}: UseSpeechTrackerOptions): UseSpeechTrackerResult {
  const supported = isSpeechRecognitionSupported();

  const [active, setActive] = useState(false);
  const [readingWordIndex, setReadingWordIndex] = useState<number | null>(null);
  const [hasCalibrated, setHasCalibrated] = useState(false);
  const [recognitionLanguage, setRecognitionLanguage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<SpeechTrackerError | null>(null);

  const cursorWordRef = useRef(0);
  const calibratedRef = useRef(false);
  const wordBufferRef = useRef<string[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldRunRef = useRef(false);
  const permissionDeniedRef = useRef(false);
  const scriptWordsRef = useRef(scriptWords);
  const parsedLinesRef = useRef(parsedLines);
  const metaOnlyWordsRef = useRef<Set<string>>(new Set());
  scriptWordsRef.current = scriptWords;
  parsedLinesRef.current = parsedLines;
  metaOnlyWordsRef.current = buildMetaOnlyWords(parsedLines);

  useEffect(() => {
    syncLogBootOnce();
    syncLogOnChange("sr.enabled", enabled, "speech tracker enabled flag");
    syncLogOnChange("sr.listen", listen, "speech tracker listen flag");
    syncLogOnChange("sr.scriptWords", scriptWords.length, "sr.scriptWordCount", {
      count: scriptWords.length,
    });

    if (!enabled || !listen || !supported || scriptWords.length === 0) {
      if (enabled && listen && scriptWords.length === 0) {
        syncWarn("sr.skip.noScriptWords", { enabled, listen, supported });
      } else if (enabled && !listen) {
        syncLogThrottled("sr.skip.notListening", 3000, "sr.skip.notListening", {
          enabled,
          listen,
          scriptWords: scriptWords.length,
        });
      } else if (!enabled) {
        syncLogThrottled("sr.skip.disabled", 3000, "sr.skip.disabled", { listen });
      }
      shouldRunRef.current = false;
      if (silenceTimerRef.current !== null) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setActive(false);
      setReadingWordIndex(null);
      setHasCalibrated(false);
      calibratedRef.current = false;
      cursorWordRef.current = 0;
      if (!enabled || !listen) {
        setRecognitionLanguage(null);
      }
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
      syncWarn("sr.notSupported");
      return;
    }

    let cancelled = false;
    shouldRunRef.current = true;
    cursorWordRef.current = 0;
    wordBufferRef.current = [];
    calibratedRef.current = false;

    const detectedLang = detectScriptLanguage(parsedLinesRef.current);
    const langCandidates = buildLangCandidates(detectedLang);
    syncLog("sr.start", {
      detectedLang,
      langCandidates,
      scriptWords: scriptWordsRef.current.length,
      scriptLines: parsedLinesRef.current.length,
    });
    let langIndex = 0;
    let unmatchedCount = 0;
    let retryWithNextLang = false;
    setRecognitionLanguage(null);
    setHasCalibrated(false);

    const startRecognition = (): SpeechRecognition => {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = langCandidates[langIndex] ?? "en";
      syncLog("sr.recognition.lang", { lang: rec.lang, langIndex });

      const armSilenceTimer = () => {
        if (silenceTimerRef.current !== null) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          if (!cancelled && !calibratedRef.current) {
            syncLog("sr.silence", { timeoutMs: SILENCE_TIMEOUT_MS });
            setReadingWordIndex(null);
          }
        }, SILENCE_TIMEOUT_MS);
      };

      rec.onstart = () => {
        if (cancelled) {
          return;
        }
        syncLog("sr.active", { lang: rec.lang });
        setActive(true);
        setError(null);
      };

      rec.onresult = (event: SpeechRecognitionEvent) => {
        if (cancelled) {
          return;
        }

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

        const interimWords = tokenize(interimText);
        const finalTail = wordBufferRef.current.slice(-MATCH_WINDOW_WORDS);
        const interimTail = interimWords.slice(-INTERIM_TAIL_WORDS);
        const wordsToMatch = [...finalTail, ...interimTail].slice(-MATCH_WINDOW_WORDS);

        if (wordsToMatch.length > 0) {
          const cursor = cursorWordRef.current;
          const isInitialLock = !calibratedRef.current;
          const matched = isInitialLock
            ? findInitialLock(wordsToMatch, scriptWordsRef.current)
            : advanceRepeatedlyFromCursor(
                wordsToMatch,
                scriptWordsRef.current,
                cursor,
                metaOnlyWordsRef.current,
              );

          if (matched !== null && shouldAcceptWordMatch(matched, cursor, isInitialLock)) {
            calibratedRef.current = true;
            unmatchedCount = 0;
            const from = cursor;
            const to = matched.wordIndex;
            cursorWordRef.current = to;
            setReadingWordIndex(to);
            setHasCalibrated(true);
            setRecognitionLanguage(rec.lang);
            const scriptWordsList = scriptWordsRef.current;
            syncLog("sr.advance", {
              from,
              to,
              delta: to - from,
              score: Number(matched.score.toFixed(3)),
              scriptWord: scriptWordsList[to]?.slice(0, 40),
              progressPct: Number(((to / Math.max(scriptWordsList.length - 1, 1)) * 100).toFixed(1)),
              lang: rec.lang,
            });
          } else {
            unmatchedCount += 1;
            if (matched !== null) {
              syncLogThrottled(
                `sr.reject.${matched.wordIndex}.${cursor}`,
                2000,
                "sr.matchRejected",
                {
                  wordIndex: matched.wordIndex,
                  score: Number(matched.score.toFixed(3)),
                  cursor,
                  forwardJump: matched.wordIndex - cursor,
                  reason: matchRejectReason(matched, cursor, isInitialLock),
                  heard: wordsToMatch.slice(-6),
                },
              );
            } else {
              syncLogThrottled("sr.noMatch", 1500, "sr.noMatch", {
                unmatchedCount,
                cursor,
                heard: wordsToMatch.slice(-6),
                windowWords: wordsToMatch.length,
                interim: interimText.trim().slice(-80),
                lang: rec.lang,
              });
            }
            if (
              unmatchedCount >= LANG_RETRY_UNMATCHED_THRESHOLD &&
              langIndex + 1 < langCandidates.length &&
              !calibratedRef.current
            ) {
              langIndex += 1;
              unmatchedCount = 0;
              wordBufferRef.current = [];
              retryWithNextLang = true;
              setRecognitionLanguage(null);
              syncWarn("sr.langRetry", {
                nextLang: langCandidates[langIndex],
                langIndex,
                keepCursor: cursorWordRef.current,
              });
              try {
                rec.stop();
              } catch {
                /* ignore */
              }
            }
          }
          armSilenceTimer();
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (cancelled) {
          return;
        }
        syncWarn("sr.error", { error: event.error, message: event.message, lang: rec.lang });
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
        if (cancelled) {
          return;
        }
        syncLog("sr.end", { retryWithNextLang, lang: rec.lang });
        setActive(false);
        if (!shouldRunRef.current || permissionDeniedRef.current) {
          return;
        }

        if (retryWithNextLang) {
          retryWithNextLang = false;
          currentRecognition = startRecognition();
          return;
        }

        try {
          rec.start();
        } catch {
          /* transient restart */
        }
      };

      try {
        rec.start();
      } catch (err) {
        if (!cancelled) {
          syncWarn("sr.startFailed", { error: String(err) });
          setError("pipeline_error");
        }
      }

      return rec;
    };

    let currentRecognition = startRecognition();

    return () => {
      syncLog("sr.stop");
      cancelled = true;
      shouldRunRef.current = false;
      calibratedRef.current = false;
      cursorWordRef.current = 0;
      if (silenceTimerRef.current !== null) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setActive(false);
      setReadingWordIndex(null);
      setHasCalibrated(false);
      setRecognitionLanguage(null);
      try {
        currentRecognition.stop();
      } catch {
        /* ignore */
      }
    };
  }, [enabled, listen, supported, scriptWords.length]);

  return {
    supported,
    active,
    readingWordIndex,
    hasCalibrated,
    recognitionLanguage,
    permissionDenied,
    error,
  };
}
