import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { Button } from "../components/ds/Button";
import { en } from "../lib/i18n/en";
import {
  BOTTOM_PADDING_MAX,
  BOTTOM_PADDING_MIN,
  DEFAULT_SETTINGS,
  loadSettings,
  pairAdaptiveFlags,
  saveSettings,
  SIDE_PADDING_MAX,
  SIDE_PADDING_MIN,
  type PrompterSettings,
  type Theme,
} from "./storage";
import { applyDocumentTheme } from "./theme";
import { SPEED_MAX, SPEED_MIN, SPEED_STEP } from "./useScroll";
import { useMicDeviceOptions } from "./useMicDeviceOptions";

export function Settings() {
  const [settings, setSettings] = useState<PrompterSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void loadSettings().then((loaded) => {
      setSettings(loaded);
      applyDocumentTheme(loaded.theme);
      setHydrated(true);
    });
  }, []);

  const { devices: micDevices, loading: micDevicesLoading } = useMicDeviceOptions(
    settings.adaptiveEnabled,
    settings.micDeviceId,
    settings.micDeviceLabel,
  );

  const update = <K extends keyof PrompterSettings>(key: K, value: PrompterSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  };

  const onMicDeviceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const deviceId = event.target.value;
    const deviceLabel =
      micDevices.find((device) => device.deviceId === deviceId)?.label ?? "";
    setSettings((prev) => {
      const next = pairAdaptiveFlags({
        ...prev,
        micDeviceId: deviceId,
        micDeviceLabel: deviceLabel,
      });
      void saveSettings(next);
      return next;
    });
    setSaved(true);
    setError(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await saveSettings(settings);
      applyDocumentTheme(settings.theme);
      setSaved(true);
      setError(null);
    } catch {
      setError(en.errors.storage);
      setSaved(false);
    }
  };

  const onNumberChange =
    (key: "speed" | "fontSize" | "sidePadding" | "bottomPadding") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      update(key, Number(event.target.value));
    };

  if (!hydrated) {
    return <p className="tp-settings-loading">{en.settings.loading}</p>;
  }

  return (
    <form className="tp-settings ds-card" onSubmit={(e) => void onSubmit(e)}>
      <h2 className="tp-settings__title">{en.settings.title}</h2>

      <div className="tp-settings__fields">
        <label className="tp-settings__range ds-range">
          <span className="ds-range__label">{en.settings.speed}</span>
          <input
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={SPEED_STEP}
            value={settings.speed}
            onChange={onNumberChange("speed")}
            aria-label={en.settings.speed}
            aria-valuemin={SPEED_MIN}
            aria-valuemax={SPEED_MAX}
            aria-valuenow={settings.speed}
          />
          <span className="ds-range__value">{settings.speed.toFixed(1)}×</span>
        </label>

        <label className="tp-settings__range ds-range">
          <span className="ds-range__label">{en.settings.fontSize}</span>
          <input
            type="range"
            min={14}
            max={48}
            step={1}
            value={settings.fontSize}
            onChange={onNumberChange("fontSize")}
            aria-label={en.settings.fontSize}
            aria-valuemin={14}
            aria-valuemax={48}
            aria-valuenow={settings.fontSize}
          />
          <span className="ds-range__value">{settings.fontSize}px</span>
        </label>

        <label className="tp-settings__range ds-range">
          <span className="ds-range__label">{en.settings.sidePadding}</span>
          <input
            type="range"
            min={SIDE_PADDING_MIN}
            max={SIDE_PADDING_MAX}
            step={1}
            value={settings.sidePadding}
            onChange={onNumberChange("sidePadding")}
            aria-label={en.settings.sidePadding}
            aria-valuemin={SIDE_PADDING_MIN}
            aria-valuemax={SIDE_PADDING_MAX}
            aria-valuenow={settings.sidePadding}
          />
          <span className="ds-range__value">{settings.sidePadding}%</span>
        </label>

        <label className="tp-settings__range ds-range">
          <span className="ds-range__label">{en.settings.bottomPadding}</span>
          <input
            type="range"
            min={BOTTOM_PADDING_MIN}
            max={BOTTOM_PADDING_MAX}
            step={1}
            value={settings.bottomPadding}
            onChange={onNumberChange("bottomPadding")}
            aria-label={en.settings.bottomPadding}
            aria-valuemin={BOTTOM_PADDING_MIN}
            aria-valuemax={BOTTOM_PADDING_MAX}
            aria-valuenow={settings.bottomPadding}
          />
          <span className="ds-range__value">{settings.bottomPadding}%</span>
        </label>

        <div
          className="tp-settings__theme ds-segmented"
          role="radiogroup"
          aria-label={en.settings.theme}
        >
          <span className="ds-segmented__group-label">{en.settings.theme}</span>
          <div className="ds-segmented__track">
            <label className="ds-segmented__option">
              <input
                type="radio"
                name="settings-theme"
                value="light"
                checked={settings.theme === "light"}
                onChange={() => update("theme", "light" as Theme)}
              />
              <span className="ds-segmented__label">{en.settings.themeLight}</span>
            </label>
            <label className="ds-segmented__option">
              <input
                type="radio"
                name="settings-theme"
                value="dark"
                checked={settings.theme === "dark"}
                onChange={() => update("theme", "dark" as Theme)}
              />
              <span className="ds-segmented__label">{en.settings.themeDark}</span>
            </label>
          </div>
        </div>

        <label className="tp-settings__mirror ds-checkbox">
          <input
            type="checkbox"
            checked={settings.mirror}
            onChange={(e) => update("mirror", e.target.checked)}
          />
          <span className="ds-checkbox__label">{en.settings.mirror}</span>
        </label>

        <label className="tp-settings__mirror ds-checkbox">
          <input
            type="checkbox"
            checked={settings.adaptiveEnabled}
            onChange={(e) => update("adaptiveEnabled", e.target.checked)}
          />
          <span className="ds-checkbox__label">{en.settings.adaptiveEnabled}</span>
        </label>

        {settings.adaptiveEnabled ? (
          <label className="tp-settings__mic ds-select">
            <span className="ds-select__label">{en.settings.micDevice}</span>
            <select
              value={settings.micDeviceId}
              onChange={onMicDeviceChange}
              disabled={micDevicesLoading}
              aria-label={en.settings.micDevice}
            >
              <option value="">{en.settings.micDeviceDefault}</option>
              {micDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {settings.adaptiveEnabled && !micDevicesLoading && micDevices.length === 0 ? (
          <p className="tp-settings__mic-hint">{en.settings.micDeviceUnavailable}</p>
        ) : null}

        {settings.adaptiveEnabled ? (
          <p className="tp-settings__privacy">{en.settings.adaptivePrivacy}</p>
        ) : null}
      </div>

      <div className="tp-settings__actions">
        <Button type="submit" variant="primary" size="md" className="tp-settings__save">
          {en.settings.save}
        </Button>
        {saved ? (
          <p className="ds-alert" data-variant="status" role="status">
            {en.settings.saved}
          </p>
        ) : null}
        {error ? (
          <p className="ds-alert" data-variant="error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
