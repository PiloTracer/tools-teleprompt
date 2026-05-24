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
