import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Settings } from "../src/prompter/Settings";
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  loadSettings,
  saveSettings,
} from "../src/prompter/storage";

describe("Settings (S3)", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    // Expose SpeechRecognition so the auto-sync toggle is rendered.
    (window as Record<string, unknown>)["SpeechRecognition"] = class MockSR {
      start = vi.fn();
      stop = vi.fn();
    };
  });

  afterEach(() => {
    delete (window as Record<string, unknown>)["SpeechRecognition"];
    vi.restoreAllMocks();
  });

  it("renders catalog controls after hydration", async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /save settings/i })).toHaveClass("ds-button");
    expect(screen.getByRole("radiogroup", { name: /theme/i })).toBeInTheDocument();
    expect(screen.getAllByRole("slider").length).toBe(4);
  });

  it("persists settings and applies document theme on save", async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save settings/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("radio", { name: /dark/i }));
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/saved/i);
    });

    expect(document.documentElement.dataset.theme).toBe("dark");
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw ?? "{}")).toMatchObject({ theme: "dark" });
  });

  it("restores saved theme on mount", async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      theme: "dark",
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /dark/i })).toBeChecked();
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("defaults adaptive toggles to off (R18–R19)", async () => {
    const loaded = await loadSettings();
    expect(loaded.adaptiveEnabled).toBe(false);
    expect(loaded.adaptiveAutoSync).toBe(false);
  });

  it("merges legacy settings without adaptive fields as false", async () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        speed: 1.5,
        fontSize: 20,
        sidePadding: 0,
        bottomPadding: 0,
        theme: "light",
        mirror: false,
      }),
    );
    const loaded = await loadSettings();
    expect(loaded.adaptiveEnabled).toBe(false);
    expect(loaded.adaptiveAutoSync).toBe(false);
    expect(loaded.speed).toBe(1.5);
  });

  it("shows privacy copy only when auto-sync on play is enabled (R19, R24)", async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: /auto-sync on play/i })).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/speech is recognised on-device/i),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /auto-sync on play/i }));

    expect(screen.getByText(/speech is recognised on-device/i)).toBeInTheDocument();
  });

  it("normalizes legacy adaptive-only saves to auto-sync on play", async () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        adaptiveEnabled: true,
        adaptiveAutoSync: false,
      }),
    );
    const loaded = await loadSettings();
    expect(loaded.adaptiveEnabled).toBe(true);
    expect(loaded.adaptiveAutoSync).toBe(true);
  });

  it("persists auto-sync on play (both adaptive flags) on save", async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: /auto-sync on play/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("checkbox", { name: /auto-sync on play/i }));
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/saved/i);
    });

    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    expect(JSON.parse(raw ?? "{}")).toMatchObject({
      adaptiveEnabled: true,
      adaptiveAutoSync: true,
    });
  });
});
