import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { en } from "../lib/i18n/en";
import { renderScript } from "../markdown/render";
import { SanitizedHtml } from "../markdown/SanitizedHtml";
import type { ScriptFormat } from "../markdown/types";
import { Help } from "./Help";
import { PlayerControls } from "./PlayerControls";
import {
  DEFAULT_SETTINGS,
  loadScriptFormat,
  loadScriptSource,
  loadSettings,
  saveSettings,
  type PrompterSettings,
} from "./storage";
import { useFullscreen } from "./useFullscreen";
import { useKeyboard } from "./useKeyboard";
import { useScroll } from "./useScroll";
import { useWakeLock } from "./useWakeLock";

const SPEED_MIN = 0.5;
const SPEED_MAX = 3;
const SPEED_STEP = 0.1;

function clampSpeed(speed: number): number {
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(speed / SPEED_STEP) * SPEED_STEP));
}

export function Player() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState("");
  const [format, setFormat] = useState<ScriptFormat>("plain");
  const [settings, setSettings] = useState<PrompterSettings>(DEFAULT_SETTINGS);
  const [isPlaying, setIsPlaying] = useState(false);
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

  useScroll(viewportRef, { isPlaying, speed: settings.speed });

  const hasScript = source.trim().length > 0;

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
    onPlayPause: () => setIsPlaying((prev) => !prev),
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
    return <p aria-busy="true">{en.play.loading}</p>;
  }

  const themeClass = settings.theme === "dark" ? "tp-player--dark" : "tp-player--light";
  const mirrorClass = settings.mirror ? "tp-player--mirror" : "";

  return (
    <section
      ref={mergeRefs}
      className={`tp-player ${themeClass} ${mirrorClass}`.trim()}
      aria-label="Teleprompter player"
    >
      <header className="tp-player-header">
        <div className="tp-player-header__primary">
          <button
            type="button"
            className="tp-player-play"
            disabled={!hasScript}
            aria-pressed={isPlaying}
            onClick={() => setIsPlaying((prev) => !prev)}
          >
            {isPlaying ? en.play.pause : en.play.play}
          </button>
          <label className="tp-player-speed">
            <span className="tp-player-speed__label">{en.settings.speed}</span>
            <input
              type="range"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={SPEED_STEP}
              value={settings.speed}
              disabled={!hasScript}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              aria-label={en.settings.speed}
              aria-valuemin={SPEED_MIN}
              aria-valuemax={SPEED_MAX}
              aria-valuenow={settings.speed}
            />
            <span className="tp-player-speed__value">{settings.speed.toFixed(1)}×</span>
          </label>
          {isSupported ? (
            <button
              type="button"
              className="tp-player-fullscreen"
              disabled={!hasScript}
              aria-pressed={isFullscreen}
              onClick={() => void toggleFullscreen()}
            >
              {isFullscreen ? en.play.exitFullscreen : en.play.fullscreen}
            </button>
          ) : null}
          <Help open={helpOpen} onToggle={() => setHelpOpen((prev) => !prev)} />
        </div>
        <PlayerControls
          settings={settings}
          isPlaying={isPlaying}
          disabled={!hasScript}
          onSettingsChange={onSettingsChange}
          onPlayPause={() => setIsPlaying((prev) => !prev)}
          showPlayButton={false}
        />
      </header>
      {!hasScript ? (
        <p className="tp-player-empty">{en.play.empty}</p>
      ) : (
        <div ref={viewportRef} className="tp-player-viewport" data-testid="player-viewport">
          <div
            className="tp-player-content"
            style={{ fontSize: `${settings.fontSize}px` }}
            data-testid="player-content"
          >
            <SanitizedHtml html={html} className="tp-player-script" />
          </div>
        </div>
      )}
    </section>
  );
}
