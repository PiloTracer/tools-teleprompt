import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { HomePage } from "../src/routes/HomePage";
import { DEFAULT_MAX_SCRIPT_BYTES, validateScriptSize } from "../src/prompter/limits";
import {
  STORAGE_KEYS,
  clearPrompterStorage,
  loadScriptFormat,
  loadScriptSource,
  saveScriptFormat,
  saveScriptSource,
} from "../src/prompter/storage";

describe("prompter limits (M3-T6)", () => {
  it("rejects scripts over 256 KB", () => {
    const big = "a".repeat(DEFAULT_MAX_SCRIPT_BYTES + 1);
    const result = validateScriptSize(big);
    expect(result.ok).toBe(false);
  });

  it("accepts scripts within limit", () => {
    expect(validateScriptSize("hello").ok).toBe(true);
  });
});

describe("prompter storage (M3-T4, SPEC R2)", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearPrompterStorage();
  });

  it("persists and restores script source and format", async () => {
    await saveScriptSource("Hello script");
    await saveScriptFormat("markdown");
    expect(await loadScriptSource()).toBe("Hello script");
    expect(await loadScriptFormat()).toBe("markdown");
    expect(localStorage.getItem(STORAGE_KEYS.source)).toBe("Hello script");
    expect(localStorage.getItem(STORAGE_KEYS.format)).toBe("markdown");
  });
});

describe("HomePage editor flow (M3-T2, T3, R11)", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearPrompterStorage();
  });

  it("loads persisted script after remount (R2)", async () => {
    await saveScriptSource("Saved line");
    await saveScriptFormat("plain");

    const { unmount } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Saved line")).toBeInTheDocument();
    });

    unmount();

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Saved line")).toBeInTheDocument();
    });
  });

  it("shows plain script tags as text in preview, not script elements (R7)", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "<script>alert(1)</script>" },
    });

    expect(document.querySelector(".tp-preview script")).toBeNull();
    expect(screen.getByTestId("sanitized-html").textContent).toContain("<script>");
  });

  it("uses catalog upload button with i18n label", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /upload/i })).toBeInTheDocument();
    });
  });

  it("has no OTP gate on home route (R11)", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <HomePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.queryByLabelText(/otp/i)).toBeNull();
      expect(screen.queryByText(/one-time/i)).toBeNull();
    });
  });
});

describe("Editor oversize (M3-T6, R1)", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearPrompterStorage();
  });

  it("shows error when content exceeds limit", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    const big = "x".repeat(DEFAULT_MAX_SCRIPT_BYTES + 1);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: big } });

    expect(await screen.findByRole("alert")).toHaveTextContent(/too large/i);
  });
});
