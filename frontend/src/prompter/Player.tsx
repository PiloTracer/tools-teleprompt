import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { en } from "../lib/i18n/en";
import { renderScript } from "../markdown/render";
import { SanitizedHtml } from "../markdown/SanitizedHtml";
import type { ScriptFormat } from "../markdown/types";
import { computeScrollTailPx } from "./playerLayout";
import { PlayerControls } from "./PlayerControls";
import { useAdaptiveScroll } from "./adaptive/useAdaptiveScroll";
import {
  isSpeechRecognitionSupported,
  useSpeechTracker,
} from "./adaptive/useSpeechTracker";
import { useVoiceActivity } from "./adaptive/useVoiceActivity";
import { parseScriptLines } from "./adaptive/parseScriptLines";
import {
  DEFAULT_SETTINGS,
  isAutoSyncOnPlay,
  loadScriptFormat,
  loadScriptSource,
  loadSettings,
  saveSettings,
  type PrompterSettings,
} from "./storage";
import { useFullscreen } from "./useFullscreen";
import { useKeyboard } from "./useKeyboard";
import { useViewportHeight } from "./useViewportHeight";
import { clampScrollSpeed } from "./useScroll";
import { useWakeLock } from "./useWakeLock";

const SPEED_STEP = 0.1;

function clampSpeed(speed: number): number {
  return Math.round(clampScrollSpeed(speed) / SPEED_STEP) * SPEED_STEP;
}

export function Player() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState("");
  const [format, setFormat] = useState<ScriptFormat>("plain");
  const [settings, setSettings] = useState<PrompterSettings>(DEFAULT_SETTINGS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncActive, setSyncActive] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { targetRef: fullscreenRef, isFullscreen, isSupported, toggleFullscreen } =
    useFullscreen();

  useWakeLock(isPlaying);

  useEffect(() => {
    void Promise.all([loadScriptSource(), loadScriptFormat(), loadSettings()]).then(
      ([text, fmt, loaded]) => {
        setSource(text);
        setFormat(fmt);
        setSettings(loaded);
        setHydrated(true);
      },
    );
  }, []);

  const html = useMemo(() => renderScript(source, format), [source, format]);

  const hasScript = source.trim().length > 0;
  const viewportHeight = useViewportHeight(viewportRef, hasScript && hydrated);
  const scrollTailPx = computeScrollTailPx(viewportHeight, settings.bottomPadding);

  // Hard gate the entire adaptive feature on SpeechRecognition support.
  // Any browser without SR (Safari, Firefox, in-app browsers, older mobile)
  // gets the fixed-speed prompter only — no mic prompt, no mic button, no
  // VAD pipeline.  Saved settings from a different browser do not leak in.
  const speechSupported = useMemo(() => isSpeechRecognitionSupported(), []);
  const adaptiveEnabled = settings.adaptiveEnabled && speechSupported;
  const adaptiveAutoSync = settings.adaptiveAutoSync && speechSupported;
  const autoSyncOnPlay = isAutoSyncOnPlay(settings) && speechSupported;
  const micSyncEngaged = adaptiveEnabled && (syncActive || (autoSyncOnPlay && isPlaying));

  const parsedLines = useMemo(() => parseScriptLines(source), [source]);

  // VAD is retained ONLY for mic-permission UX (audible feedback that the
  // mic stream is alive).  The new 4-rule resolver does not consume VAD;
  // it relies entirely on SR-reported `readingLineIndex` + DOM-measured
  // line positions.
  const { permissionDenied: vadPermissionDenied } = useVoiceActivity({
    enabled: adaptiveEnabled,
    listen: micSyncEngaged,
  });

  // Continuous speech-to-script tracker.  Drives Rules 1–3 via the line
  // index it reports for the current voice match.
  const {
    readingLineIndex,
    hasCalibrated: trackerCalibrated,
    permissionDenied: srPermissionDenied,
  } = useSpeechTracker({
    enabled: adaptiveEnabled,
    listen: micSyncEngaged,
    parsedLines,
  });

  // Show the mic-denied hint if either input source was refused.
  const permissionDenied = vadPermissionDenied || srPermissionDenied;

  useAdaptiveScroll({
    viewportRef,
    source,
    isPlaying,
    speed: settings.speed,
    fontSizePx: settings.fontSize,
    adaptiveEnabled,
    micSyncEngaged,
    readingLineIndex,
  });

  useEffect(() => {
    if (adaptiveEnabled && adaptiveAutoSync && isPlaying) {
      setSyncActive(true);
    }
  }, [adaptiveEnabled, adaptiveAutoSync, isPlaying]);

  useEffect(() => {
    if (!isPlaying && autoSyncOnPlay) {
      setSyncActive(false);
    }
  }, [isPlaying, autoSyncOnPlay]);

  useEffect(() => {
    if (!adaptiveEnabled) {
      setSyncActive(false);
    }
  }, [adaptiveEnabled]);

  const onSyncToggle = useCallback(() => {
    setSyncActive((prev) => !prev);
  }, []);

  const onSettingsChange = useCallback((next: PrompterSettings) => {
    setSettings(next);
    void saveSettings(next);
  }, []);

  const onSpeedChange = useCallback((speed: number) => {
    setSettings((prev) => {
      const next = { ...prev, speed: clampSpeed(speed) };
      void saveSettings(next);
      return next;
    });
  }, []);

  const adjustSpeed = useCallback(
    (delta: number) => {
      onSpeedChange(settings.speed + delta);
    },
    [onSpeedChange, settings.speed],
  );

  useKeyboard({
    enabled: hasScript && hydrated,
    onPlayPause: () => {
      setIsPlaying((prev) => {
        const next = !prev;
        if (next && adaptiveEnabled && adaptiveAutoSync) {
          setSyncActive(true);
        }
        return next;
      });
    },
    onSpeedUp: () => adjustSpeed(SPEED_STEP),
    onSpeedDown: () => adjustSpeed(-SPEED_STEP),
    onToggleFullscreen: () => void toggleFullscreen(),
  });

  const mergeRefs = useCallback(
    (node: HTMLElement | null) => {
      fullscreenRef.current = node;
    },
    [fullscreenRef],
  );

  if (!hydrated) {
    return (
      <div
        className="tp-player-loading tp-player-loading--skeleton"
        aria-busy="true"
        aria-live="polite"
        aria-label={en.play.loading}
      >
        <span className="tp-player-loading__sr">{en.play.loading}</span>
        <div className="tp-player-loading__bar" aria-hidden />
        <div className="tp-player-loading__bar tp-player-loading__bar--short" aria-hidden />
        <div className="tp-player-loading__bar tp-player-loading__bar--medium" aria-hidden />
      </div>
    );
  }

  const themeClass = settings.theme === "dark" ? "tp-player--dark" : "tp-player--light";
  const mirrorClass = settings.mirror ? "tp-player--mirror" : "";

  return (
    <section
      ref={mergeRefs}
      className={`tp-player ${themeClass} ${mirrorClass}`.trim()}
      aria-label="Teleprompter player"
    >
      {!hasScript ? (
        <div className="tp-player-empty-state">
          <p className="tp-player-empty">{en.play.empty}</p>
          <Link to="/" className="ds-button" data-variant="secondary" data-size="sm">
            {en.play.emptyCta}
          </Link>
        </div>
      ) : (
        <div ref={viewportRef} className="tp-player-viewport" data-testid="player-viewport">
          <div
            className="tp-player-content"
            style={{
              fontSize: `${settings.fontSize}px`,
              paddingLeft: `calc(1rem + ${settings.sidePadding}vw)`,
              paddingRight: `calc(1rem + ${settings.sidePadding}vw)`,
            }}
            data-testid="player-content"
          >
            <SanitizedHtml html={html} className="tp-player-script" />
            <div
              className="tp-player-scroll-tail"
              data-testid="player-scroll-tail"
              style={{ height: `${scrollTailPx}px` }}
              aria-hidden
            />
          </div>
        </div>
      )}
      <PlayerControls
        settings={settings}
        isPlaying={isPlaying}
        disabled={!hasScript}
        isFullscreen={isFullscreen}
        isFullscreenSupported={isSupported}
        helpOpen={helpOpen}
        adaptiveActive={adaptiveEnabled}
        syncActive={syncActive}
        trackerCalibrated={trackerCalibrated}
        micPermissionDenied={permissionDenied}
        onSettingsChange={onSettingsChange}
        onPlayPause={() => {
          setIsPlaying((prev) => {
            const next = !prev;
            if (next && adaptiveEnabled && adaptiveAutoSync) {
              setSyncActive(true);
            }
            return next;
          });
        }}
        onSpeedChange={onSpeedChange}
        onToggleFullscreen={() => void toggleFullscreen()}
        onHelpToggle={() => setHelpOpen((prev) => !prev)}
        onSyncToggle={onSyncToggle}
      />
    </section>
  );
}
