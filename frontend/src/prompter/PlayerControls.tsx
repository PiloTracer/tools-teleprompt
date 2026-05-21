import type { ChangeEvent } from "react";

import { en } from "../lib/i18n/en";
import type { PrompterSettings, Theme } from "./storage";

export type PlayerControlsProps = {
  settings: PrompterSettings;
  isPlaying: boolean;
  disabled?: boolean;
  onSettingsChange: (settings: PrompterSettings) => void;
  onPlayPause: () => void;
  /** When false, play/pause lives in the player header primary row. */
  showPlayButton?: boolean;
};

export function PlayerControls({
  settings,
  isPlaying,
  disabled = false,
  onSettingsChange,
  onPlayPause,
  showPlayButton = true,
}: PlayerControlsProps) {
  const update = <K extends keyof PrompterSettings>(
    key: K,
    value: PrompterSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const onNumberChange =
    (key: "fontSize") => (event: ChangeEvent<HTMLInputElement>) => {
      update(key, Number(event.target.value));
    };

  return (
    <div className="tp-player-controls" role="toolbar" aria-label="Player settings">
      {showPlayButton ? (
        <button
          type="button"
          className="tp-player-play"
          disabled={disabled}
          aria-pressed={isPlaying}
          onClick={onPlayPause}
        >
          {isPlaying ? en.play.pause : en.play.play}
        </button>
      ) : null}
      <label className="tp-player-control tp-player-control--font">
        <span className="tp-player-control__label">{en.settings.fontSize}</span>
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
        <span className="tp-player-control__value">{settings.fontSize}px</span>
      </label>
      <label className="tp-player-control tp-player-control--theme">
        <span className="tp-player-control__label">{en.settings.theme}</span>
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
      <label className="tp-player-control tp-player-control--mirror tp-checkbox">
        <input
          type="checkbox"
          disabled={disabled}
          checked={settings.mirror}
          onChange={(e) => update("mirror", e.target.checked)}
        />
        <span className="tp-player-control__label">{en.settings.mirror}</span>
      </label>
    </div>
  );
}
