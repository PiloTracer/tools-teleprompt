import { useCallback, useState, type ChangeEvent } from "react";

import { Button } from "../components/ds/Button";
import { Help } from "./Help";
import { en } from "../lib/i18n/en";
import {
  BOTTOM_PADDING_MAX,
  BOTTOM_PADDING_MIN,
  SIDE_PADDING_MAX,
  SIDE_PADDING_MIN,
  type PrompterSettings,
} from "./storage";

const SPEED_MIN = 0.5;
const SPEED_MAX = 3;
const SPEED_STEP = 0.1;

type LeverId = "speed" | "fontSize" | "sidePadding" | "bottomPadding";

const LEVER_ORDER: LeverId[] = ["speed", "fontSize", "sidePadding", "bottomPadding"];

const LEVER_TAB_LABEL: Record<LeverId, string> = {
  speed: en.playerControls.speed,
  fontSize: en.playerControls.fontSize,
  sidePadding: en.playerControls.sidePadding,
  bottomPadding: en.playerControls.bottomPadding,
};

export type PlayerControlsProps = {
  settings: PrompterSettings;
  isPlaying: boolean;
  disabled?: boolean;
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  helpOpen: boolean;
  syncActive?: boolean;
  micPermissionDenied?: boolean;
  onSettingsChange: (settings: PrompterSettings) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleFullscreen: () => void;
  onHelpToggle: () => void;
  onSyncToggle?: () => void;
};

function leverIndex(id: LeverId): number {
  return LEVER_ORDER.indexOf(id);
}

function cycleLever(id: LeverId, direction: -1 | 1): LeverId {
  const next = (leverIndex(id) + direction + LEVER_ORDER.length) % LEVER_ORDER.length;
  return LEVER_ORDER[next]!;
}

export function PlayerControls({
  settings,
  isPlaying,
  disabled = false,
  isFullscreen,
  isFullscreenSupported,
  helpOpen,
  syncActive = false,
  micPermissionDenied = false,
  onSettingsChange,
  onPlayPause,
  onSpeedChange,
  onToggleFullscreen,
  onHelpToggle,
  onSyncToggle,
}: PlayerControlsProps) {
  const [activeLever, setActiveLever] = useState<LeverId>("speed");

  const update = <K extends keyof PrompterSettings>(
    key: K,
    value: PrompterSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const onNumberChange =
    (key: "fontSize" | "sidePadding" | "bottomPadding") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      update(key, Number(event.target.value));
    };

  const cycle = useCallback((direction: -1 | 1) => {
    setActiveLever((current) => cycleLever(current, direction));
  }, []);

  const formatLeverValue = (id: LeverId): string => {
    switch (id) {
      case "speed":
        return `${settings.speed.toFixed(1)}×`;
      case "fontSize":
        return String(settings.fontSize);
      case "sidePadding":
        return String(settings.sidePadding);
      case "bottomPadding":
        return String(settings.bottomPadding);
    }
  };

  const activeSliderLabel = (() => {
    switch (activeLever) {
      case "speed":
        return en.settings.speed;
      case "fontSize":
        return en.settings.fontSize;
      case "sidePadding":
        return en.settings.sidePadding;
      case "bottomPadding":
        return en.settings.bottomPadding;
    }
  })();

  const renderActiveSlider = () => {
    switch (activeLever) {
      case "speed":
        return (
          <input
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={SPEED_STEP}
            value={settings.speed}
            disabled={disabled}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            aria-label={activeSliderLabel}
            aria-valuemin={SPEED_MIN}
            aria-valuemax={SPEED_MAX}
            aria-valuenow={settings.speed}
          />
        );
      case "fontSize":
        return (
          <input
            type="range"
            min={14}
            max={48}
            step={1}
            value={settings.fontSize}
            disabled={disabled}
            onChange={onNumberChange("fontSize")}
            aria-label={activeSliderLabel}
            aria-valuemin={14}
            aria-valuemax={48}
            aria-valuenow={settings.fontSize}
          />
        );
      case "sidePadding":
        return (
          <input
            type="range"
            min={SIDE_PADDING_MIN}
            max={SIDE_PADDING_MAX}
            step={1}
            value={settings.sidePadding}
            disabled={disabled}
            onChange={onNumberChange("sidePadding")}
            aria-label={activeSliderLabel}
            aria-valuemin={SIDE_PADDING_MIN}
            aria-valuemax={SIDE_PADDING_MAX}
            aria-valuenow={settings.sidePadding}
          />
        );
      case "bottomPadding":
        return (
          <input
            type="range"
            min={BOTTOM_PADDING_MIN}
            max={BOTTOM_PADDING_MAX}
            step={1}
            value={settings.bottomPadding}
            disabled={disabled}
            onChange={onNumberChange("bottomPadding")}
            aria-label={activeSliderLabel}
            aria-valuemin={BOTTOM_PADDING_MIN}
            aria-valuemax={BOTTOM_PADDING_MAX}
            aria-valuenow={settings.bottomPadding}
          />
        );
    }
  };

  return (
    <footer className="tp-player-footer">
      <div className="tp-player-toolbar" role="toolbar" aria-label="Player settings">
        <div className="tp-player-toolbar__row tp-player-toolbar__row--primary">
          <button
            type="button"
            className="ds-button tp-player-play"
            data-variant="primary"
            data-size="sm"
            disabled={disabled}
            aria-pressed={isPlaying}
            onClick={onPlayPause}
          >
            {isPlaying ? en.play.pause : en.play.play}
          </button>

          {settings.adaptiveEnabled ? (
            <button
              type="button"
              className={`ds-button tp-player-mic${micPermissionDenied ? " tp-player-mic--denied" : ""}`}
              data-variant={syncActive ? "primary" : "secondary"}
              data-size="sm"
              disabled={disabled}
              aria-label={en.play.micSync}
              aria-pressed={syncActive}
              data-testid="player-mic-sync"
              onClick={onSyncToggle}
            >
              <svg
                className="tp-player-mic__icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="currentColor"
                  d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V19H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-1.08A7 7 0 0 0 17 11z"
                />
              </svg>
            </button>
          ) : null}

          <div className="tp-player-lever-strip" data-testid="player-lever-dock">
            <div
              className="tp-player-lever-tabs"
              role="tablist"
              aria-label={en.playerControls.leverGroup}
            >
              {LEVER_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`player-lever-tab-${id}`}
                  className="tp-player-lever-tab"
                  aria-selected={activeLever === id}
                  aria-controls="player-lever-panel"
                  disabled={disabled}
                  onClick={() => setActiveLever(id)}
                >
                  {LEVER_TAB_LABEL[id]}
                </button>
              ))}
            </div>

            <label className="tp-player-mirror" title={en.settings.mirror}>
              <input
                type="checkbox"
                disabled={disabled}
                checked={settings.mirror}
                aria-label={en.settings.mirror}
                onChange={(e) => update("mirror", e.target.checked)}
              />
              <span className="tp-player-mirror__control" aria-hidden="true" />
              <span className="tp-player-mirror__label">{en.playerControls.mirror}</span>
            </label>
          </div>
        </div>

        {settings.adaptiveEnabled && micPermissionDenied ? (
          <p
            className="tp-player-mic-hint ds-alert"
            data-variant="status"
            role="status"
            data-testid="player-mic-denied-hint"
          >
            {en.play.micPermissionDenied}
          </p>
        ) : null}

        <div className="tp-player-toolbar__row tp-player-toolbar__row--lever">
          {isFullscreenSupported ? (
            <button
              type="button"
              className="ds-button tp-player-fullscreen"
              data-variant="secondary"
              data-size="sm"
              disabled={disabled}
              aria-pressed={isFullscreen}
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? en.play.exitFullscreenShort : en.play.fullscreenShort}
            </button>
          ) : (
            <span className="tp-player-toolbar__spacer" aria-hidden />
          )}

          <div
            id="player-lever-panel"
            className="tp-player-lever-panel"
            role="tabpanel"
            aria-labelledby={`player-lever-tab-${activeLever}`}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="tp-player-lever-cycle"
              disabled={disabled}
              aria-label={en.playerControls.leverPrev}
              onClick={() => cycle(-1)}
            >
              ‹
            </Button>

            <label className="tp-player-lever-slider ds-range ds-range--player ds-range--player-focus">
              {renderActiveSlider()}
              <span className="ds-range__value">{formatLeverValue(activeLever)}</span>
            </label>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="tp-player-lever-cycle"
              disabled={disabled}
              aria-label={en.playerControls.leverNext}
              onClick={() => cycle(1)}
            >
              ›
            </Button>
          </div>

          <Help open={helpOpen} disabled={disabled} onToggle={onHelpToggle} compact />
        </div>
      </div>
    </footer>
  );
}
