import type { ChangeEvent } from "react";

import { en } from "../lib/i18n/en";
import { Help } from "./Help";
import {
  BOTTOM_PADDING_MAX,
  BOTTOM_PADDING_MIN,
  SIDE_PADDING_MAX,
  SIDE_PADDING_MIN,
  type PrompterSettings,
  type Theme,
} from "./storage";

const SPEED_MIN = 0.5;
const SPEED_MAX = 3;
const SPEED_STEP = 0.1;

export type PlayerControlsProps = {
  settings: PrompterSettings;
  isPlaying: boolean;
  disabled?: boolean;
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  helpOpen: boolean;
  onSettingsChange: (settings: PrompterSettings) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleFullscreen: () => void;
  onHelpToggle: () => void;
};

export function PlayerControls({
  settings,
  isPlaying,
  disabled = false,
  isFullscreen,
  isFullscreenSupported,
  helpOpen,
  onSettingsChange,
  onPlayPause,
  onSpeedChange,
  onToggleFullscreen,
  onHelpToggle,
}: PlayerControlsProps) {
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

  return (
    <footer className="tp-player-footer">
      <div className="tp-player-toolbar" role="toolbar" aria-label="Player settings">
        <button
          type="button"
          className="tp-player-play"
          disabled={disabled}
          aria-pressed={isPlaying}
          onClick={onPlayPause}
        >
          {isPlaying ? en.play.pause : en.play.play}
        </button>

        <label className="tp-player-control tp-player-control--range">
          <span className="tp-player-control__label">{en.playerControls.speed}</span>
          <input
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={SPEED_STEP}
            value={settings.speed}
            disabled={disabled}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            aria-label={en.settings.speed}
            aria-valuemin={SPEED_MIN}
            aria-valuemax={SPEED_MAX}
            aria-valuenow={settings.speed}
          />
          <span className="tp-player-control__value">{settings.speed.toFixed(1)}×</span>
        </label>

        <label className="tp-player-control tp-player-control--range">
          <span className="tp-player-control__label">{en.playerControls.fontSize}</span>
          <input
            type="range"
            min={14}
            max={48}
            step={1}
            value={settings.fontSize}
            disabled={disabled}
            onChange={onNumberChange("fontSize")}
            aria-label={en.settings.fontSize}
            aria-valuemin={14}
            aria-valuemax={48}
            aria-valuenow={settings.fontSize}
          />
          <span className="tp-player-control__value">{settings.fontSize}</span>
        </label>

        <label className="tp-player-control tp-player-control--range">
          <span className="tp-player-control__label">{en.playerControls.sidePadding}</span>
          <input
            type="range"
            min={SIDE_PADDING_MIN}
            max={SIDE_PADDING_MAX}
            step={1}
            value={settings.sidePadding}
            disabled={disabled}
            onChange={onNumberChange("sidePadding")}
            aria-label={en.settings.sidePadding}
            aria-valuemin={SIDE_PADDING_MIN}
            aria-valuemax={SIDE_PADDING_MAX}
            aria-valuenow={settings.sidePadding}
          />
          <span className="tp-player-control__value">{settings.sidePadding}</span>
        </label>

        <label className="tp-player-control tp-player-control--range">
          <span className="tp-player-control__label">{en.playerControls.bottomPadding}</span>
          <input
            type="range"
            min={BOTTOM_PADDING_MIN}
            max={BOTTOM_PADDING_MAX}
            step={1}
            value={settings.bottomPadding}
            disabled={disabled}
            onChange={onNumberChange("bottomPadding")}
            aria-label={en.settings.bottomPadding}
            aria-valuemin={BOTTOM_PADDING_MIN}
            aria-valuemax={BOTTOM_PADDING_MAX}
            aria-valuenow={settings.bottomPadding}
          />
          <span className="tp-player-control__value">{settings.bottomPadding}</span>
        </label>

        <label className="tp-player-control tp-player-control--theme">
          <span className="tp-player-control__label">{en.playerControls.theme}</span>
          <select
            value={settings.theme}
            disabled={disabled}
            aria-label={en.settings.theme}
            onChange={(e) => update("theme", e.target.value as Theme)}
          >
            <option value="light">{en.settings.themeLight}</option>
            <option value="dark">{en.settings.themeDark}</option>
          </select>
        </label>

        <label
          className="tp-player-control tp-player-control--mirror tp-checkbox"
          title={en.settings.mirror}
        >
          <input
            type="checkbox"
            disabled={disabled}
            checked={settings.mirror}
            aria-label={en.settings.mirror}
            onChange={(e) => update("mirror", e.target.checked)}
          />
          <span className="tp-player-control__label">{en.playerControls.mirror}</span>
        </label>

        <div className="tp-player-toolbar__actions">
          {isFullscreenSupported ? (
            <button
              type="button"
              className="tp-player-fullscreen"
              disabled={disabled}
              aria-pressed={isFullscreen}
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? en.play.exitFullscreen : en.play.fullscreen}
            </button>
          ) : null}
          <Help open={helpOpen} onToggle={onHelpToggle} />
        </div>
      </div>
    </footer>
  );
}
