import { useCallback, useState, type ChangeEvent } from "react";

import { Button } from "../components/ds/Button";
import { en } from "../lib/i18n/en";
import { Help } from "./Help";
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
  onSettingsChange: (settings: PrompterSettings) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleFullscreen: () => void;
  onHelpToggle: () => void;
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
  onSettingsChange,
  onPlayPause,
  onSpeedChange,
  onToggleFullscreen,
  onHelpToggle,
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
            aria-label={en.settings.speed}
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
            aria-label={en.settings.fontSize}
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
            aria-label={en.settings.sidePadding}
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
            aria-label={en.settings.bottomPadding}
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

        <div className="tp-player-lever-dock" data-testid="player-lever-dock">
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
              <span className="ds-range__label">{LEVER_TAB_LABEL[activeLever]}</span>
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
        </div>

        <div
          className="tp-player-control tp-player-control--theme ds-segmented"
          role="group"
          aria-label={en.settings.theme}
        >
          <span className="ds-segmented__group-label">{en.playerControls.theme}</span>
          <div className="ds-segmented__track">
            <label className="ds-segmented__option">
              <input
                type="radio"
                name="player-theme"
                value="light"
                disabled={disabled}
                checked={settings.theme === "light"}
                onChange={() => update("theme", "light")}
              />
              <span className="ds-segmented__label">{en.settings.themeLight}</span>
            </label>
            <label className="ds-segmented__option">
              <input
                type="radio"
                name="player-theme"
                value="dark"
                disabled={disabled}
                checked={settings.theme === "dark"}
                onChange={() => update("theme", "dark")}
              />
              <span className="ds-segmented__label">{en.settings.themeDark}</span>
            </label>
          </div>
        </div>

        <label
          className="tp-player-control tp-player-control--mirror ds-checkbox"
          title={en.settings.mirror}
        >
          <input
            type="checkbox"
            disabled={disabled}
            checked={settings.mirror}
            aria-label={en.settings.mirror}
            onChange={(e) => update("mirror", e.target.checked)}
          />
          <span className="ds-checkbox__label">{en.playerControls.mirror}</span>
        </label>

        <div className="tp-player-toolbar__actions">
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
              {isFullscreen ? en.play.exitFullscreen : en.play.fullscreen}
            </button>
          ) : null}
          <Help open={helpOpen} onToggle={onHelpToggle} disabled={disabled} />
        </div>
      </div>
    </footer>
  );
}
