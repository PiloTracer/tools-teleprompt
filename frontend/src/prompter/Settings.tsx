import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { en } from "../lib/i18n/en";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type PrompterSettings,
  type Theme,
  BOTTOM_PADDING_MAX,
  BOTTOM_PADDING_MIN,
  SIDE_PADDING_MAX,
  SIDE_PADDING_MIN,
} from "./storage";

export function Settings() {
  const [settings, setSettings] = useState<PrompterSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  const update = <K extends keyof PrompterSettings>(key: K, value: PrompterSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await saveSettings(settings);
    setSaved(true);
  };

  const onNumberChange =
    (key: "speed" | "fontSize" | "sidePadding" | "bottomPadding") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      update(key, Number(event.target.value));
    };

  return (
    <form className="tp-settings" onSubmit={(e) => void onSubmit(e)}>
      <h2>{en.settings.title}</h2>
      <label>
        {en.settings.speed}
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={settings.speed}
          onChange={onNumberChange("speed")}
        />
        <span>{settings.speed.toFixed(1)}×</span>
      </label>
      <label>
        {en.settings.fontSize}
        <input
          type="range"
          min={14}
          max={48}
          step={1}
          value={settings.fontSize}
          onChange={onNumberChange("fontSize")}
        />
        <span>{settings.fontSize}px</span>
      </label>
      <label>
        {en.settings.sidePadding}
        <input
          type="range"
          min={SIDE_PADDING_MIN}
          max={SIDE_PADDING_MAX}
          step={1}
          value={settings.sidePadding}
          onChange={onNumberChange("sidePadding")}
        />
        <span>{settings.sidePadding}%</span>
      </label>
      <label>
        {en.settings.bottomPadding}
        <input
          type="range"
          min={BOTTOM_PADDING_MIN}
          max={BOTTOM_PADDING_MAX}
          step={1}
          value={settings.bottomPadding}
          onChange={onNumberChange("bottomPadding")}
        />
        <span>{settings.bottomPadding}%</span>
      </label>
      <label>
        {en.settings.theme}
        <select
          value={settings.theme}
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
          onChange={(e) => update("mirror", e.target.checked)}
        />
        {en.settings.mirror}
      </label>
      <button type="submit">Save</button>
      {saved ? <p role="status">{en.settings.saved}</p> : null}
    </form>
  );
}
