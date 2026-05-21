import type { ChangeEvent } from "react";

import { en } from "../lib/i18n/en";
import type { PrompterSettings, Theme } from "./storage";

export type PlayerControlsProps = {
  settings: PrompterSettings;
  isPlaying: boolean;
  disabled?: boolean;
  onSettingsChange: (settings: PrompterSettings) => void;
  onPlayPause: () => void;
};

export function PlayerControls({
  settings,
  isPlaying,
  disabled = false,
  onSettingsChange,
  onPlayPause,
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
    <div className="tp-player-controls" role="toolbar" aria-label="Player controls">
      <button
        type="button"
        className="tp-player-play"
        disabled={disabled}
        aria-pressed={isPlaying}
        onClick={onPlayPause}
      >
        {isPlaying ? en.play.pause : en.play.play}
      </button>
      <label>
        {en.settings.fontSize}
        <input
          type="range"
          min={14}
          max={48}
          step={1}
          value={settings.fontSize}
          disabled={disabled}
          onChange={onNumberChange("fontSize")}
          aria-valuemin={14}
          aria-valuemax={48}
          aria-valuenow={settings.fontSize}
        />
        <span>{settings.fontSize}px</span>
      </label>
      <label>
        {en.settings.theme}
        <select
          value={settings.theme}
          disabled={disabled}
          onChange={(e) => update("theme", e.target.value as Theme)}
        >
          <option value="light">{en.settings.themeLight}</option>
          <option value="dark">{en.settings.themeDark}</option>
        </select>
      </label>
      <label className="tp-checkbox">
        <input
          type="checkbox"
          checked={settings.mirror}
          disabled={disabled}
          onChange={(e) => update("mirror", e.target.checked)}
        />
        {en.settings.mirror}
      </label>
    </div>
  );
}
