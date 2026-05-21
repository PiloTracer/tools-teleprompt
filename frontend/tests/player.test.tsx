import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Player } from "../src/prompter/Player";
import { Help } from "../src/prompter/Help";
import { useKeyboard } from "../src/prompter/useKeyboard";
import { isWakeLockSupported } from "../src/prompter/useWakeLock";
import { BASE_SCROLL_PX_PER_SEC, applyScrollStep, scrollDeltaPx, simulateScrollPx } from "../src/prompter/useScroll";
import { PlayPage } from "../src/routes/PlayPage";
import {
  clearPrompterStorage,
  saveScriptFormat,
  saveScriptSource,
  saveSettings,
} from "../src/prompter/storage";

describe("useScroll (M4-T1)", () => {
  it("computes delta proportional to speed", () => {
    const at1x = scrollDeltaPx(1000, 1);
    const at2x = scrollDeltaPx(1000, 2);
    expect(at1x).toBe(BASE_SCROLL_PX_PER_SEC);
    expect(at2x).toBe(BASE_SCROLL_PX_PER_SEC * 2);
  });

  it("clamps speed to 0.5–3×", () => {
    expect(scrollDeltaPx(1000, 0.1)).toBe(scrollDeltaPx(1000, 0.5));
    expect(scrollDeltaPx(1000, 10)).toBe(scrollDeltaPx(1000, 3));
  });

  it("accumulates fractional scroll at 0.5× (R3)", () => {
    const withoutCarry = scrollDeltaPx(16.67, 0.5);
    expect(withoutCarry).toBeLessThan(1);

    const stepped = applyScrollStep(0, 0, withoutCarry, 10_000);
    expect(stepped.scrollTop).toBe(0);
    expect(stepped.carryPx).toBeCloseTo(withoutCarry, 5);

    const afterOneSecond = simulateScrollPx(1000, 16.67, 0.5);
    expect(afterOneSecond).toBeGreaterThan(0);
    expect(afterOneSecond).toBeGreaterThanOrEqual(20);
    expect(afterOneSecond).toBeLessThanOrEqual(25);
  });

  it("scrolls at 1× over one simulated second", () => {
    const afterOneSecond = simulateScrollPx(1000, 16.67, 1);
    expect(afterOneSecond).toBeGreaterThanOrEqual(45);
    expect(afterOneSecond).toBeLessThanOrEqual(50);
  });
});

describe("Player (M4-T1)", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearPrompterStorage();
  });

  it("renders script via SanitizedHtml (R6)", async () => {
    await saveScriptSource("Hello **world**");
    await saveScriptFormat("markdown");

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("sanitized-html")).toBeInTheDocument();
    });
    expect(screen.getByTestId("sanitized-html").textContent).toContain("world");
  });

  it("shows empty state when no script", async () => {
    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/no script loaded/i)).toBeInTheDocument();
    });
  });

  it("speed slider updates displayed multiplier", async () => {
    await saveScriptSource("Line one");
    await saveScriptFormat("plain");
    await saveSettings({ speed: 1, fontSize: 24, theme: "light", mirror: false });

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/scroll speed/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/scroll speed/i), { target: { value: "0.5" } });
    expect(screen.getByText("0.5×")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/scroll speed/i), { target: { value: "2.5" } });
    expect(screen.getByText("2.5×")).toBeInTheDocument();
  });

  it("plays at minimum speed 0.5× (R3)", async () => {
    await saveScriptSource("Slow scroll\n".repeat(80));
    await saveScriptFormat("plain");
    await saveSettings({ speed: 0.5, fontSize: 24, theme: "light", mirror: false });

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    });

    const viewport = screen.getByTestId("player-viewport");
    Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 200 });
    Object.defineProperty(viewport, "scrollHeight", { configurable: true, value: 4000 });
    viewport.scrollTop = 0;

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await waitFor(
      () => {
        expect(viewport.scrollTop).toBeGreaterThan(0);
      },
      { timeout: 3000, interval: 50 },
    );
  });
});

describe("PlayerControls (M4-T2, R3–R4)", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearPrompterStorage();
  });

  it("toggles play/pause (R3)", async () => {
    await saveScriptSource("Scroll me");
    await saveScriptFormat("plain");

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("adjusts font size on player content (R3)", async () => {
    await saveScriptSource("Sized text");
    await saveScriptFormat("plain");
    await saveSettings({ speed: 1, fontSize: 24, theme: "light", mirror: false });

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("player-content")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/font size/i), { target: { value: "32" } });
    expect(screen.getByTestId("player-content")).toHaveStyle({ fontSize: "32px" });
  });

  it("applies dark theme class (R3)", async () => {
    await saveScriptSource("Theme test");
    await saveScriptFormat("plain");

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/theme/i), { target: { value: "dark" } });
    expect(screen.getByLabelText(/teleprompter player/i)).toHaveClass("tp-player--dark");
  });

  it("applies mirror class (R4)", async () => {
    await saveScriptSource("Mirror test");
    await saveScriptFormat("plain");

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: /mirror/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("checkbox", { name: /mirror/i }));
    expect(screen.getByLabelText(/teleprompter player/i)).toHaveClass("tp-player--mirror");
  });

  it("persists control changes to storage (R2 settings)", async () => {
    await saveScriptSource("Persist");
    await saveScriptFormat("plain");
    await saveSettings({ speed: 1, fontSize: 24, theme: "light", mirror: false });

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/font size/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/font size/i), { target: { value: "36" } });

    await waitFor(() => {
      const raw = localStorage.getItem("tp:settings");
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!).fontSize).toBe(36);
    });
  });
});

describe("Fullscreen and wake lock (M4-T3, R4–R5)", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearPrompterStorage();
  });

  it("requests wake lock when playback starts (R5)", async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({ release });
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request },
    });

    await saveScriptSource("Wake lock script");
    await saveScriptFormat("plain");

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith("screen");
    });

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));

    await waitFor(() => {
      expect(release).toHaveBeenCalled();
    });
  });

  it("exposes wake lock support helper", () => {
    expect(typeof isWakeLockSupported()).toBe("boolean");
  });

  it("toggles fullscreen on the player section (R4)", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: exitFullscreen,
    });

    await saveScriptSource("Fullscreen script");
    await saveScriptFormat("plain");

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Fullscreen" })).toBeInTheDocument();
    });

    const section = screen.getByLabelText(/teleprompter player/i);
    Object.defineProperty(section, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });

    fireEvent.click(screen.getByRole("button", { name: "Fullscreen" }));

    await waitFor(() => {
      expect(requestFullscreen).toHaveBeenCalled();
    });
  });
});

describe("Keyboard shortcuts (M4-T6, R12)", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearPrompterStorage();
  });

  it("toggles play/pause with space", async () => {
    await saveScriptSource("Keyboard script");
    await saveScriptFormat("plain");

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { code: "Space" });
    expect(screen.getByRole("button", { name: "Pause" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("adjusts speed with +/- keys", async () => {
    await saveScriptSource("Speed keys");
    await saveScriptFormat("plain");
    await saveSettings({ speed: 1, fontSize: 24, theme: "light", mirror: false });

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("1.0×")).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "+" });
    expect(screen.getByText("1.1×")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "-" });
    expect(screen.getByText("1.0×")).toBeInTheDocument();
  });

  it("renders help panel with shortcut list", () => {
    render(
      <Help open={true} onToggle={() => undefined} />,
    );
    expect(screen.getByRole("region", { name: /keyboard shortcuts/i })).toBeInTheDocument();
    expect(screen.getByText(/space — play/i)).toBeInTheDocument();
  });

  it("ignores shortcuts when typing in an input", async () => {
    await saveScriptSource("Input focus");
    await saveScriptFormat("plain");

    render(
      <MemoryRouter>
        <Player />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/scroll speed/i)).toBeInTheDocument();
    });

    const slider = screen.getByLabelText(/scroll speed/i);
    slider.focus();
    fireEvent.keyDown(slider, { code: "Space" });
    expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("useKeyboard hook", () => {
  it("invokes handlers for shortcut keys", () => {
    const onPlayPause = vi.fn();
    const onSpeedUp = vi.fn();
    const onSpeedDown = vi.fn();
    const onToggleFullscreen = vi.fn();

    function Harness() {
      useKeyboard({
        onPlayPause,
        onSpeedUp,
        onSpeedDown,
        onToggleFullscreen,
      });
      return null;
    }

    render(<Harness />);
    fireEvent.keyDown(window, { code: "Space" });
    fireEvent.keyDown(window, { key: "+" });
    fireEvent.keyDown(window, { key: "-" });
    fireEvent.keyDown(window, { key: "f" });

    expect(onPlayPause).toHaveBeenCalledTimes(1);
    expect(onSpeedUp).toHaveBeenCalledTimes(1);
    expect(onSpeedDown).toHaveBeenCalledTimes(1);
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
  });
});

describe("PlayPage (M4-T1)", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearPrompterStorage();
  });

  it("mounts player on /play route", async () => {
    await saveScriptSource("Play route script");

    render(
      <MemoryRouter initialEntries={["/play"]}>
        <PlayPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/teleprompter player/i)).toBeInTheDocument();
    });
  });
});
