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
import {
  openMicSession,
  releaseMicStream,
  resolveMicForSpeech,
  sampleMicLevel,
} from "./micDevice";
import {
  isSyncDebugEnabled,
  syncLog,
  syncLogBootOnce,
  syncLogOnChange,
  syncLogThrottled,
  syncWarn,
} from "./syncDebug";
import { startSpeechRecognition } from "./speechRecognitionStart";

const WORD_BUFFER_SIZE = 44;
const MATCH_WINDOW_WORDS = 20;
/** Interim SR words merged into the match window for faster live re-alignment. */
const INTERIM_TAIL_WORDS = 8;
export const SILENCE_TIMEOUT_MS = 2200;
const LANG_RETRY_UNMATCHED_THRESHOLD = 8;
const SR_RESTART_DELAY_MS = 280;

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
  micDeviceId?: string;
  micDeviceLabel?: string;
  onMicDeviceRemapped?: (deviceId: string, deviceLabel: string) => void;
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
  micDeviceId = "",
  micDeviceLabel = "",
  onMicDeviceRemapped,
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
  const micDeviceIdRef = useRef(micDeviceId);
  const micDeviceLabelRef = useRef(micDeviceLabel);
  const onMicDeviceRemappedRef = useRef(onMicDeviceRemapped);
  scriptWordsRef.current = scriptWords;
  parsedLinesRef.current = parsedLines;
  metaOnlyWordsRef.current = buildMetaOnlyWords(parsedLines);
  micDeviceIdRef.current = micDeviceId;
  micDeviceLabelRef.current = micDeviceLabel;
  onMicDeviceRemappedRef.current = onMicDeviceRemapped;

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
    let micStream: MediaStream | null = null;
    let activeMicDeviceId = "";
    let restartTimer: ReturnType<typeof setTimeout> | null = null;
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

    const getMicTrack = (): MediaStreamTrack | null => {
      const track = micStream?.getAudioTracks()[0] ?? null;
      if (track?.readyState === "live" && track.kind === "audio") {
        return track;
      }
      return null;
    };

    const startRecognitionInstance = (rec: SpeechRecognition, reason: string): boolean => {
      if (cancelled || !shouldRunRef.current) {
        return false;
      }
      let track = getMicTrack();
      let started = startSpeechRecognition(rec, track);
      if (!started.ok && started.trackStartFailed) {
        syncWarn("sr.mic.trackStartUnsupported", {
          hint: "Update Chrome or set selected mic as system default",
          deviceId: activeMicDeviceId,
          error: String(started.error),
        });
        releaseMicStream(micStream);
        micStream = null;
        track = null;
        started = startSpeechRecognition(rec, null);
      }
      if (started.ok) {
        syncLog("sr.startInstance", {
          reason,
          lang: rec.lang,
          mode: started.mode,
          deviceId: activeMicDeviceId || "default",
          trackState: track?.readyState ?? "none",
        });
        return true;
      }
      syncWarn("sr.startFailed", {
        error: String(started.error),
        reason,
        lang: rec.lang,
        trackStartFailed: started.trackStartFailed,
      });
      setError("pipeline_error");
      return false;
    };

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
          if (!cancelled) {
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

      rec.onaudiostart = () => {
        syncLogThrottled("sr.audioStart", 2000, "sr.audioStart", { lang: rec.lang });
      };

      rec.onspeechstart = () => {
        syncLogThrottled("sr.speechStart", 2000, "sr.speechStart", { lang: rec.lang });
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

        if (finalText.trim() || interimText.trim()) {
          syncLogThrottled("sr.heard", 400, "sr.heard", {
            final: finalText.trim().slice(-80),
            interim: interimText.trim().slice(-80),
            lang: rec.lang,
          });
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
        if (event.error === "no-speech") {
          /* Benign — onend restarts after priming mic again. */
        } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
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

        if (restartTimer !== null) {
          clearTimeout(restartTimer);
        }
        restartTimer = setTimeout(() => {
          restartTimer = null;
          if (cancelled || !shouldRunRef.current || permissionDeniedRef.current) {
            return;
          }

          currentRecognition = startRecognition();
          if (retryWithNextLang) {
            retryWithNextLang = false;
            startRecognitionInstance(currentRecognition, "langRetry");
            return;
          }

          startRecognitionInstance(currentRecognition, "restart");
        }, SR_RESTART_DELAY_MS);
      };

      return rec;
    };

    let currentRecognition: SpeechRecognition | null = null;

    void (async () => {
      const resolved = await resolveMicForSpeech(
        micDeviceIdRef.current,
        micDeviceLabelRef.current,
      );
      activeMicDeviceId = resolved.deviceId;
      syncLog("sr.mic.resolve", {
        requestedDeviceId: micDeviceIdRef.current || "default",
        requestedLabel: micDeviceLabelRef.current || "",
        resolvedDeviceId: resolved.deviceId || "default",
        resolvedLabel: resolved.deviceLabel || "",
        remapped: resolved.remapped,
        unavailable: resolved.unavailable,
      });
      if (resolved.remapped && resolved.deviceId) {
        onMicDeviceRemappedRef.current?.(resolved.deviceId, resolved.deviceLabel);
      } else if (
        resolved.deviceLabel &&
        resolved.deviceId &&
        micDeviceLabelRef.current !== resolved.deviceLabel
      ) {
        onMicDeviceRemappedRef.current?.(resolved.deviceId, resolved.deviceLabel);
      }
      if (resolved.unavailable) {
        syncWarn("sr.mic.unavailable", {
          deviceId: micDeviceIdRef.current,
          label: micDeviceLabelRef.current,
        });
      }
      if (cancelled) {
        return;
      }

      if (activeMicDeviceId) {
        try {
          const session = await openMicSession(activeMicDeviceId);
          micStream = session.stream;
          syncLog("sr.mic.hold", {
            deviceIdUsed: session.deviceIdUsed,
            tracks: micStream?.getAudioTracks().length ?? 0,
          });
          if (micStream && isSyncDebugEnabled()) {
            const level = await sampleMicLevel(micStream);
            syncLog("sr.mic.level", {
              rms: Number(level.toFixed(4)),
              deviceId: session.deviceIdUsed,
            });
            if (level < 0.001) {
              syncWarn("sr.mic.silent", {
                hint: "Mic stream open but no input signal detected",
                deviceId: session.deviceIdUsed,
              });
            }
          }
        } catch (err) {
          permissionDeniedRef.current = true;
          setPermissionDenied(true);
          setError("permission_denied");
          syncWarn("sr.mic.denied", {
            error: String(err),
            deviceId: activeMicDeviceId,
          });
          return;
        }
      } else {
        syncLog("sr.mic.default", { note: "SR uses browser default input" });
      }

      if (cancelled) {
        releaseMicStream(micStream);
        micStream = null;
        return;
      }

      currentRecognition = startRecognition();
      startRecognitionInstance(currentRecognition, "initial");
    })();

    return () => {
      syncLog("sr.stop");
      cancelled = true;
      shouldRunRef.current = false;
      if (restartTimer !== null) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }
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
      releaseMicStream(micStream);
      micStream = null;
      if (currentRecognition) {
        try {
          currentRecognition.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, [enabled, listen, supported, scriptWords.length, micDeviceId, micDeviceLabel]);

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
