import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { Settings } from "../src/prompter/Settings";
import { STORAGE_KEYS, saveSettings } from "../src/prompter/storage";

describe("Settings (S3)", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
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
    expect(screen.getByRole("group", { name: /display & layout/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /speech sync/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /theme/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /mirror text/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /speech sync/i })).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /auto-sync/i })).not.toBeInTheDocument();
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
      speed: 1,
      fontSize: 22,
      sidePadding: 0,
      bottomPadding: 0,
      adaptiveEnabled: false,
      adaptiveAutoSync: false,
      micDeviceId: "",
      micDeviceLabel: "",
      theme: "dark",
      mirror: false,
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
});
