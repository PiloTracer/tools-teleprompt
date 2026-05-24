import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  annotateScriptWords,
  clearScriptWordAnnotations,
} from "./adaptive/annotateScriptWords";
import {
  detectScriptLanguage,
  formatRecognitionLanguageLabel,
} from "./adaptive/detectScriptLanguage";
import { parseScriptLines } from "./adaptive/parseScriptLines";
import {
  isSpeechRecognitionSupported,
  useSpeechTracker,
} from "./adaptive/useSpeechTracker";
import { useSyncScroll } from "./adaptive/useSyncScroll";
import { useReadingLineMark } from "./adaptive/useReadingLineMark";
import { syncLog, syncLogBootOnce, syncLogOnChange } from "./adaptive/syncDebug";
import { en } from "../lib/i18n/en";
import { renderScript } from "../markdown/render";
import { SanitizedHtml } from "../markdown/SanitizedHtml";
import type { ScriptFormat } from "../markdown/types";
import { formatViewportGridRows } from "./playerLayout";
import { PlayerControls } from "./PlayerControls";
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
import { clampScrollSpeed, SPEED_STEP } from "./useScroll";
import { useViewportHeight } from "./useViewportHeight";
import { useWakeLock } from "./useWakeLock";

function clampSpeed(speed: number): number {
  return Math.round(clampScrollSpeed(speed) / SPEED_STEP) * SPEED_STEP;
}

export function Player() {
  const viewportFrameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const scriptRootRef = useRef<HTMLDivElement>(null);
  const scriptWordsRef = useRef<string[]>([]);

  const [source, setSource] = useState("");
  const [format, setFormat] = useState<ScriptFormat>("plain");
  const [settings, setSettings] = useState<PrompterSettings>(DEFAULT_SETTINGS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncActive, setSyncActive] = useState(false);
  const [scriptWordsVersion, setScriptWordsVersion] = useState(0);
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
  const parsedLines = useMemo(() => parseScriptLines(source), [source]);

  const hasScript = source.trim().length > 0;
  const viewportHeight = useViewportHeight(viewportFrameRef, hasScript);
  const viewportGridRows = formatViewportGridRows(viewportHeight, settings.bottomPadding);

  const speechSupported = useMemo(() => isSpeechRecognitionSupported(), []);
  const adaptiveEnabled = settings.adaptiveEnabled && speechSupported;
  const autoSyncOnPlay = isAutoSyncOnPlay(settings) && speechSupported;
  const micSyncEngaged =
    adaptiveEnabled && (syncActive || (isPlaying && settings.adaptiveAutoSync));

  useEffect(() => {
    syncLogBootOnce();
  }, []);

  const scriptWords = useMemo(() => {
    void scriptWordsVersion;
    return scriptWordsRef.current;
  }, [scriptWordsVersion]);

  useLayoutEffect(() => {
    const root = scriptRootRef.current;
    if (!root || !hasScript) {
      scriptWordsRef.current = [];
      return;
    }

    clearScriptWordAnnotations(root);
    scriptWordsRef.current = annotateScriptWords(root);
    syncLog("player.annotateWords", { count: scriptWordsRef.current.length });
    setScriptWordsVersion((version) => version + 1);
  }, [html, hasScript, settings.fontSize, settings.sidePadding]);

  const {
    readingWordIndex,
    recognitionLanguage: activeRecognitionLanguage,
    permissionDenied: srPermissionDenied,
  } = useSpeechTracker({
    enabled: adaptiveEnabled,
    listen: micSyncEngaged,
    scriptWords,
    parsedLines,
  });

  useReadingLineMark({
    scriptRootRef,
    readingWordIndex,
    engaged: micSyncEngaged && isPlaying,
    scriptWordsVersion,
  });

  useSyncScroll({
    viewportRef,
    scriptRootRef,
    isPlaying,
    speed: settings.speed,
    syncEngaged: micSyncEngaged,
  });

  useEffect(() => {
    if (adaptiveEnabled && settings.adaptiveAutoSync && isPlaying) {
      setSyncActive(true);
    }
  }, [adaptiveEnabled, settings.adaptiveAutoSync, isPlaying]);

  useEffect(() => {
    if (!adaptiveEnabled) {
      setSyncActive(false);
    }
  }, [adaptiveEnabled]);

  const detectedLanguage = useMemo(
    () => formatRecognitionLanguageLabel(detectScriptLanguage(parsedLines)),
    [parsedLines],
  );

  const displayRecognitionLanguage =
    activeRecognitionLanguage !== null && activeRecognitionLanguage.trim().length > 0
      ? formatRecognitionLanguageLabel(activeRecognitionLanguage)
      : detectedLanguage;

  const languageDetermined =
    activeRecognitionLanguage !== null && activeRecognitionLanguage.trim().length > 0;

  useEffect(() => {
    syncLogOnChange("player.adaptiveEnabled", settings.adaptiveEnabled, "player.adaptiveEnabled");
    syncLogOnChange("player.syncActive", syncActive, "player.syncActive");
    syncLogOnChange("player.micSyncEngaged", micSyncEngaged, "player.micSyncEngaged", {
      adaptiveEnabled,
      autoSyncOnPlay,
      isPlaying,
    });
    syncLogOnChange(
      "player.recognitionLanguage",
      displayRecognitionLanguage,
      "player.recognitionLanguage",
    );
    syncLogOnChange("player.readingWordIndex", readingWordIndex, "player.readingWordIndex");
  }, [
    adaptiveEnabled,
    autoSyncOnPlay,
    displayRecognitionLanguage,
    isPlaying,
    micSyncEngaged,
    readingWordIndex,
    settings.adaptiveEnabled,
    syncActive,
  ]);

  const onSettingsChange = useCallback((next: PrompterSettings) => {
    setSettings(next);
    void saveSettings(next);
  }, []);

  const onToggleSpeechSync = useCallback(() => {
    const nextEnabled = !settings.adaptiveEnabled;
    syncLog("player.toggleSpeechSync", { nextEnabled, wasEnabled: settings.adaptiveEnabled });
    const next: PrompterSettings = {
      ...settings,
      adaptiveEnabled: nextEnabled,
      adaptiveAutoSync: nextEnabled ? settings.adaptiveAutoSync || true : false,
    };
    onSettingsChange(next);
    setSyncActive(nextEnabled && (isPlaying || next.adaptiveAutoSync));
  }, [isPlaying, onSettingsChange, settings]);

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

  const onPlayPause = useCallback(() => {
    if (!isPlaying && speechSupported) {
      setSettings((prev) => {
        if (prev.adaptiveEnabled && prev.adaptiveAutoSync) {
          return prev;
        }
        const next: PrompterSettings = {
          ...prev,
          adaptiveEnabled: true,
          adaptiveAutoSync: true,
        };
        void saveSettings(next);
        return next;
      });
      setSyncActive(true);
    }
    setIsPlaying((prev) => !prev);
  }, [isPlaying, speechSupported]);

  useKeyboard({
    enabled: hasScript && hydrated,
    onPlayPause,
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
        <div className="tp-player-scroll-column">
          <div
            ref={viewportFrameRef}
            className="tp-player-viewport"
            data-testid="player-viewport"
            style={{ gridTemplateRows: viewportGridRows }}
          >
            <div
              ref={viewportRef}
              className="tp-player-viewport-scroll"
              data-testid="player-viewport-scroll"
            >
              <div
                className="tp-player-content"
                style={{
                  fontSize: `${settings.fontSize}px`,
                  paddingLeft: `calc(1rem + ${settings.sidePadding}vw)`,
                  paddingRight: `calc(1rem + ${settings.sidePadding}vw)`,
                }}
                data-testid="player-content"
              >
                <SanitizedHtml
                  ref={scriptRootRef}
                  html={html}
                  className="tp-player-script"
                />
              </div>
            </div>
          </div>
          {srPermissionDenied ? (
            <p className="tp-player-sync-hint" role="status">
              {en.play.micPermissionDenied}
            </p>
          ) : null}
          {settings.adaptiveEnabled && !speechSupported ? (
            <p className="tp-player-sync-hint" role="status">
              {en.play.micNotSupported}
            </p>
          ) : null}
        </div>
      )}
      <PlayerControls
        settings={settings}
        isPlaying={isPlaying}
        disabled={!hasScript}
        isFullscreen={isFullscreen}
        isFullscreenSupported={isSupported}
        helpOpen={helpOpen}
        speechSupported={speechSupported}
        syncFeatureEnabled={settings.adaptiveEnabled}
        recognitionLanguage={displayRecognitionLanguage}
        languageDetermined={languageDetermined}
        onToggleSpeechSync={onToggleSpeechSync}
        onSettingsChange={onSettingsChange}
        onPlayPause={onPlayPause}
        onSpeedChange={onSpeedChange}
        onToggleFullscreen={() => void toggleFullscreen()}
        onHelpToggle={() => setHelpOpen((prev) => !prev)}
      />
    </section>
  );
}
