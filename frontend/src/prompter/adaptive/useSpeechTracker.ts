import { useEffect, useRef, useState } from "react";

import {
  advanceRepeatedlyFromCursor,
  findInitialLock,
  findRelockAnchoredToIndex,
  matchRejectReason,
  RELOCK_BACKWARD_VIEWPORT_GAP,
  RELOCK_DRIFT_BACKWARD_VIEWPORT_GAP,
  shouldAcceptRelockMatch,
  shouldAcceptWordMatch,
  type WordMatchResult,
} from "./matchScriptWords";
import { clearNormalizeCache, tokenize } from "./normalize";
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

const WORD_BUFFER_SIZE = 16;
const MATCH_WINDOW_WORDS = 16;
/** Interim SR words merged into the match window for faster live re-alignment. */
const INTERIM_TAIL_WORDS = 8;
/**
 * Stage-1 silence: clear the visual reading mark so the user sees
 * "I'm listening". Cursor and calibration are preserved — a resume within
 * the re-lock window continues from the existing cursor via normal steady
 * advance (no re-lock, no wobble on natural breath pauses).
 */
export const SILENCE_MARK_CLEAR_MS = 1750;

/** Alias preserved for backward compatibility. */
export const SILENCE_TIMEOUT_MS = SILENCE_MARK_CLEAR_MS;

/**
 * Stage-2 silence: arm viewport-anchored re-lock for the next SR result.
 * Set above natural between-sentence breath pauses so brief silences do not
 * trigger re-lock.
 */
export const RELOCK_ARM_TIMEOUT_MS = 4000;

const LANG_RETRY_UNMATCHED_THRESHOLD = 8;
const SR_RESTART_DELAY_MS = 280;

/**
 * Failed re-lock attempts (after silence) before falling back to a global
 * initial-lock scan. Keeps the post-silence latency bounded.
 */
const MAX_RELOCK_FALLBACK_TICKS = 5;

/**
 * Consecutive steady-advance ticks returning no match before we force a
 * viewport-anchored re-lock — handles silent drift where the silence timer
 * never fired (sustained low-volume mumbling, etc.). Set conservatively so
 * brief mic noise gaps during normal reading do not trip it.
 */
const SILENT_DRIFT_NULL_TICKS = 10;

/**
 * Min spoken words required before attempting re-lock. A short 2–3 word
 * interim chunk is rarely unique within the search radius and produces
 * imprecise landings that then cause back-and-forth as steady advance and
 * drift-induced re-lock fight each other. Waiting one extra SR tick for a
 * 5-word run dramatically stabilises the lock at the cost of ~0.3–0.7s of
 * latency on the first re-attempt.
 */
const MIN_RELOCK_SPOKEN_WORDS = 4;

/**
 * After a successful re-lock, suppress *drift-induced* re-lock for this long.
 * Lets steady advance settle, the scroll smoothly recenter, and the SR
 * interim stabilise without firing a second re-lock attempt. Silence
 * stage-2 timer is NOT suppressed (genuine long pauses still re-arm).
 */
const RELOCK_COOLDOWN_MS = 2000;

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
  /**
   * Returns the script word index currently at the viewport's read-zone band,
   * or null if unknown. Called only at re-lock time (post-silence), never per
   * SR result or per frame.
   */
  getViewportAnchorWordIndex?: () => number | null;
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
  getViewportAnchorWordIndex,
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
  const markClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const relockArmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldRunRef = useRef(false);
  const permissionDeniedRef = useRef(false);
  const scriptWordsRef = useRef(scriptWords);
  const parsedLinesRef = useRef(parsedLines);
  const metaOnlyWordsRef = useRef<Set<string>>(new Set());
  const micDeviceIdRef = useRef(micDeviceId);
  const micDeviceLabelRef = useRef(micDeviceLabel);
  const onMicDeviceRemappedRef = useRef(onMicDeviceRemapped);
  const getViewportAnchorWordIndexRef = useRef(getViewportAnchorWordIndex);
  const awaitingRelockRef = useRef(false);
  const relockAttemptsRef = useRef(0);
  const relockFallbackCountRef = useRef(0);
  const nullAdvanceStreakRef = useRef(0);
  const relockTriggerRef = useRef<"silence" | "drift" | null>(null);
  const relockCooldownUntilRef = useRef(0);
  scriptWordsRef.current = scriptWords;
  parsedLinesRef.current = parsedLines;
  metaOnlyWordsRef.current = buildMetaOnlyWords(parsedLines);
  micDeviceIdRef.current = micDeviceId;
  micDeviceLabelRef.current = micDeviceLabel;
  onMicDeviceRemappedRef.current = onMicDeviceRemapped;
  getViewportAnchorWordIndexRef.current = getViewportAnchorWordIndex;

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
      if (markClearTimerRef.current !== null) {
        clearTimeout(markClearTimerRef.current);
        markClearTimerRef.current = null;
      }
      if (relockArmTimerRef.current !== null) {
        clearTimeout(relockArmTimerRef.current);
        relockArmTimerRef.current = null;
      }
      setActive(false);
      setReadingWordIndex(null);
      setHasCalibrated(false);
      calibratedRef.current = false;
      cursorWordRef.current = 0;
      awaitingRelockRef.current = false;
      relockAttemptsRef.current = 0;
      nullAdvanceStreakRef.current = 0;
      relockTriggerRef.current = null;
      relockFallbackCountRef.current = 0;
      relockCooldownUntilRef.current = 0;
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
    awaitingRelockRef.current = false;
    relockAttemptsRef.current = 0;
    nullAdvanceStreakRef.current = 0;
    relockTriggerRef.current = null;
    relockCooldownUntilRef.current = 0;
    relockFallbackCountRef.current = 0;

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
        if (markClearTimerRef.current !== null) {
          clearTimeout(markClearTimerRef.current);
        }
        if (relockArmTimerRef.current !== null) {
          clearTimeout(relockArmTimerRef.current);
        }

        // Stage 1: clear the visual mark — feedback only; cursor preserved so a
        // resume within RELOCK_ARM_TIMEOUT_MS continues via steady advance.
        markClearTimerRef.current = setTimeout(() => {
          if (cancelled) {
            return;
          }
          syncLog("sr.silence.markClear", {
            timeoutMs: SILENCE_MARK_CLEAR_MS,
            cursor: cursorWordRef.current,
            calibrated: calibratedRef.current,
          });
          setReadingWordIndex(null);
          wordBufferRef.current = wordBufferRef.current.slice(-4);
          clearNormalizeCache();
        }, SILENCE_MARK_CLEAR_MS);

        // Stage 2: longer silence — user may have skipped ahead while the lever
        // moved the viewport. Arm viewport-anchored re-lock for the next SR
        // result and drop the stale spoken tail. Silence-triggered re-lock is
        // NOT subject to the cooldown.
        relockArmTimerRef.current = setTimeout(() => {
          if (cancelled) {
            return;
          }
          syncLog("sr.silence.relockArm", {
            timeoutMs: RELOCK_ARM_TIMEOUT_MS,
            cursor: cursorWordRef.current,
            calibrated: calibratedRef.current,
          });
          wordBufferRef.current = wordBufferRef.current.slice(-3);
          if (calibratedRef.current) {
            awaitingRelockRef.current = true;
            relockTriggerRef.current = "silence";
            relockAttemptsRef.current = 0;
            relockFallbackCountRef.current = 0;
            nullAdvanceStreakRef.current = 0;
          }
        }, RELOCK_ARM_TIMEOUT_MS);
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
          const needsRelock = !isInitialLock && awaitingRelockRef.current;

          let matched: WordMatchResult | null = null;
          let matchMode: "initial" | "relock" | "relockFallback" | "advance" = "advance";
          let relockAnchor: number = cursor;
          let usedFallback = false;

          if (isInitialLock) {
            matchMode = "initial";
            matched = findInitialLock(wordsToMatch, scriptWordsRef.current);
          } else if (needsRelock) {
            matchMode = "relock";
            const trigger = relockTriggerRef.current;
            const backwardGap =
              trigger === "drift"
                ? RELOCK_DRIFT_BACKWARD_VIEWPORT_GAP
                : RELOCK_BACKWARD_VIEWPORT_GAP;

            // Defer until we have enough spoken signal — a 2–3 word interim
            // chunk is rarely unique within the search radius and produces
            // imprecise landings that then ping-pong with steady advance.
            if (wordsToMatch.length < MIN_RELOCK_SPOKEN_WORDS) {
              syncLogThrottled(
                "sr.relock.defer",
                1000,
                "sr.relock.deferShortTail",
                {
                  trigger,
                  spokenLen: wordsToMatch.length,
                  needed: MIN_RELOCK_SPOKEN_WORDS,
                  cursor,
                },
              );
              armSilenceTimer();
              return;
            }

            const viewportAnchor = getViewportAnchorWordIndexRef.current?.();
            // Silence re-lock: anchor search to CURSOR (our ground truth,
            // hasn't drifted during the pause). Drift re-lock: anchor to
            // VIEWPORT (cursor may be wrong due to sustained misalignment).
            const searchAnchor =
              trigger === "silence" ? cursor : (viewportAnchor ?? cursor);
            relockAnchor = searchAnchor;
            matched = findRelockAnchoredToIndex(
              wordsToMatch,
              scriptWordsRef.current,
              searchAnchor,
            );
            // Backward-gap uses viewport as independent signal: "did user
            // actually move backward?" (separate from where we chose to search).
            const gapAnchor = viewportAnchor ?? cursor;
            if (
              matched !== null &&
              !shouldAcceptRelockMatch(matched, cursor, gapAnchor, backwardGap)
            ) {
              syncLogThrottled(
                `sr.relock.rejectBackward.${matched.wordIndex}`,
                2000,
                "sr.relock.rejectBackward",
                {
                  trigger,
                  matched: matched.wordIndex,
                  cursor,
                  anchor: relockAnchor,
                  backwardGap,
                  matchedWords: matched.matchedWords,
                  distinctive: matched.distinctiveMatchedWords,
                },
              );
              matched = null;
            }
            if (matched === null) {
              relockAttemptsRef.current += 1;
              if (relockAttemptsRef.current >= MAX_RELOCK_FALLBACK_TICKS) {
                matchMode = "relockFallback";
                usedFallback = true;
                // Global search: same 4/3 floor but scan the entire script.
                // findInitialLock only searches first 250 words — useless
                // when user is deep in the script after a pause.
                matched = findRelockAnchoredToIndex(
                  wordsToMatch,
                  scriptWordsRef.current,
                  cursor,
                  scriptWordsRef.current.length,
                );
                if (
                  matched !== null &&
                  !shouldAcceptRelockMatch(matched, cursor, gapAnchor, backwardGap)
                ) {
                  matched = null;
                }
                if (matched === null) {
                  relockFallbackCountRef.current += 1;
                  if (relockFallbackCountRef.current >= 3) {
                    syncLog("sr.relock.giveUp", {
                      trigger,
                      cursor,
                      fallbackCount: relockFallbackCountRef.current,
                    });
                    awaitingRelockRef.current = false;
                    relockAttemptsRef.current = 0;
                    relockFallbackCountRef.current = 0;
                    relockTriggerRef.current = null;
                    matched = advanceRepeatedlyFromCursor(
                      wordsToMatch,
                      scriptWordsRef.current,
                      cursor,
                      metaOnlyWordsRef.current,
                    );
                    matchMode = "advance";
                  }
                }
              }
            }
          } else {
            matched = advanceRepeatedlyFromCursor(
              wordsToMatch,
              scriptWordsRef.current,
              cursor,
              metaOnlyWordsRef.current,
            );
          }

          // Re-lock and initial-lock branches use the matcher's own acceptance
          // criteria (strict run + distinctive minimum). Steady advance still
          // requires shouldAcceptWordMatch to guard against tiny coincidences.
          const matchAccepted =
            matched !== null &&
            (matchMode !== "advance"
              ? true
              : shouldAcceptWordMatch(matched, cursor, false));

          if (matched !== null && matchAccepted) {
            const wasRelocking = needsRelock;
            calibratedRef.current = true;
            unmatchedCount = 0;
            awaitingRelockRef.current = false;
            relockAttemptsRef.current = 0;
            nullAdvanceStreakRef.current = 0;
            if (wasRelocking) {
              wordBufferRef.current = [];
              relockCooldownUntilRef.current = Date.now() + RELOCK_COOLDOWN_MS;
            } else {
              wordBufferRef.current = wordBufferRef.current.slice(-12);
            }
            relockTriggerRef.current = null;
            const from = cursor;
            const to = matched.wordIndex;
            cursorWordRef.current = to;
            setReadingWordIndex(to);
            setHasCalibrated(true);
            setRecognitionLanguage(rec.lang);
            const scriptWordsList = scriptWordsRef.current;
            syncLog("sr.advance", {
              mode: matchMode,
              from,
              to,
              delta: to - from,
              relockAnchor: wasRelocking ? relockAnchor : undefined,
              usedFallback: usedFallback || undefined,
              score: Number(matched.score.toFixed(3)),
              matchedWords: matched.matchedWords,
              distinctive: matched.distinctiveMatchedWords,
              scriptWord: scriptWordsList[to]?.slice(0, 40),
              progressPct: Number(((to / Math.max(scriptWordsList.length - 1, 1)) * 100).toFixed(1)),
              lang: rec.lang,
            });
          } else {
            unmatchedCount += 1;
            if (!isInitialLock && !needsRelock) {
              nullAdvanceStreakRef.current += 1;
              if (nullAdvanceStreakRef.current >= SILENT_DRIFT_NULL_TICKS) {
                const inCooldown = Date.now() < relockCooldownUntilRef.current;
                if (inCooldown) {
                  // Cooldown active: let the scroll and SR interim settle
                  // before another re-lock fires. Reset streak so we re-evaluate
                  // after cooldown rather than re-triggering on the next null.
                  nullAdvanceStreakRef.current = 0;
                  syncLogThrottled(
                    "sr.relock.suppressDrift",
                    2000,
                    "sr.relock.suppressDriftCooldown",
                    {
                      cursor,
                      cooldownMsRemaining: Math.max(
                        0,
                        relockCooldownUntilRef.current - Date.now(),
                      ),
                    },
                  );
                } else {
                  awaitingRelockRef.current = true;
                  relockTriggerRef.current = "drift";
                  relockAttemptsRef.current = 0;
                  relockFallbackCountRef.current = 0;
                  nullAdvanceStreakRef.current = 0;
                  wordBufferRef.current = [];
                  syncLog("sr.relock.forced", {
                    reason: "silentDrift",
                    cursor,
                  });
                }
              }
            }
            if (matched !== null) {
              syncLogThrottled(
                `sr.reject.${matched.wordIndex}.${cursor}`,
                2000,
                "sr.matchRejected",
                {
                  mode: matchMode,
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
                mode: matchMode,
                unmatchedCount,
                relockAttempts: relockAttemptsRef.current,
                cursor,
                relockAnchor: needsRelock ? relockAnchor : undefined,
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
        clearNormalizeCache();
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
      awaitingRelockRef.current = false;
      relockAttemptsRef.current = 0;
      nullAdvanceStreakRef.current = 0;
      relockTriggerRef.current = null;
      relockCooldownUntilRef.current = 0;
      relockFallbackCountRef.current = 0;
      if (markClearTimerRef.current !== null) {
        clearTimeout(markClearTimerRef.current);
        markClearTimerRef.current = null;
      }
      if (relockArmTimerRef.current !== null) {
        clearTimeout(relockArmTimerRef.current);
        relockArmTimerRef.current = null;
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
