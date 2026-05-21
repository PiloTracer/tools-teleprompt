import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HandoffClaim } from "../src/pairing/HandoffClaim";
import { HandoffCreate } from "../src/pairing/HandoffCreate";
import { QrConsume } from "../src/pairing/QrConsume";
import { claimRelaySession, createRelaySession } from "../src/pairing/client";
import { decodeHandoffFromHash } from "../src/pairing/qrDecode";
import { encodeHandoffFragment } from "../src/pairing/qrEncode";
import * as qrThreshold from "../src/pairing/qrThreshold";
import {
  clearPrompterStorage,
  loadScriptSource,
  saveScriptSource,
} from "../src/prompter/storage";

vi.mock("../src/pairing/client", () => ({
  createRelaySession: vi.fn(),
  claimRelaySession: vi.fn(),
  createLanHandoff: vi.fn(),
  claimLanHandoff: vi.fn(),
  lanHandoffPageUrl: vi.fn((token: string) => `/handoff/lan/${token}`),
  PairingApiError: class PairingApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(async (url: string) => `data:image/png;base64,mock-${url.length}`),
  },
}));

const mockedCreate = vi.mocked(createRelaySession);
const mockedClaim = vi.mocked(claimRelaySession);

/** Poorly compressible script that exceeds QR fragment threshold after deflate. */
function buildIncompressibleScript(): string {
  return Array.from({ length: 700 }, () => crypto.randomUUID()).join("\n");
}

describe("HandoffCreate (M5-T8)", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearPrompterStorage();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("offers QR handoff for small scripts without calling relay API", async () => {
    vi.stubEnv("VITE_PUBLIC_HOST", "10.42.0.1");
    vi.stubEnv("VITE_PUBLIC_PORT", "9173");
    vi.stubEnv("VITE_PUBLIC_ORIGIN", "");
    await saveScriptSource("My script");

    render(
      <MemoryRouter initialEntries={["/handoff/create"]}>
        <Routes>
          <Route path="/handoff/create" element={<HandoffCreate />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("handoff-qr-button")).toBeEnabled();
    });
    expect(screen.getByTestId("handoff-mode-hint")).toHaveTextContent(/single-QR handoff/i);
    expect(mockedCreate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("handoff-qr-button"));

    await waitFor(() => {
      expect(screen.getByTestId("handoff-qr-mode")).toBeInTheDocument();
    });
    expect(screen.getByTestId("handoff-qr-image")).toHaveAttribute("src", expect.stringContaining("data:image/png"));
    expect(mockedCreate).not.toHaveBeenCalled();
    const handoffLink = screen.getByTestId("handoff-qr-mode").querySelector("a[href*='handoff/receive']");
    expect(handoffLink?.getAttribute("href")).toMatch(/^http:\/\/10\.42\.0\.1:9173\/handoff\/receive#tp=v1\./);
    vi.unstubAllEnvs();
  });

  it("selects multi-QR when single QR is too large", async () => {
    const oversized = buildIncompressibleScript();
    await saveScriptSource(oversized);

    render(
      <MemoryRouter initialEntries={["/handoff/create"]}>
        <Routes>
          <Route path="/handoff/create" element={<HandoffCreate />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("handoff-multi-qr-mode")).toBeInTheDocument();
    });
    expect(screen.getByTestId("handoff-mode-hint")).toHaveTextContent(/multiple QR/i);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("uses relay when earlier modes are unavailable", async () => {
    vi.spyOn(qrThreshold, "resolveHandoffMode").mockResolvedValue("relay");
    await saveScriptSource("Relay fallback script");
    mockedCreate.mockResolvedValueOnce({
      token: "tok",
      otp: "654321",
      claim_url: "/handoff/claim/tok",
      expires_at: "2026-05-21T12:00:00Z",
    });

    render(
      <MemoryRouter initialEntries={["/handoff/create"]}>
        <Routes>
          <Route path="/handoff/create" element={<HandoffCreate />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("handoff-relay-button")).toBeEnabled();
    });
    expect(screen.getByTestId("handoff-mode-hint")).toHaveTextContent(/relay handoff/i);

    fireEvent.click(screen.getByTestId("handoff-relay-button"));

    await waitFor(() => {
      expect(screen.getByTestId("handoff-session")).toBeInTheDocument();
    });
    expect(mockedCreate).toHaveBeenCalledWith("Relay fallback script", "plain");
  });

  it("shows size error when script exceeds relay limit", async () => {
    const oversized = "x".repeat(300_000);
    await saveScriptSource(oversized);

    render(
      <MemoryRouter initialEntries={["/handoff/create"]}>
        <Routes>
          <Route path="/handoff/create" element={<HandoffCreate />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("handoff-relay-button")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("handoff-relay-button"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/too large/i);
    });
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});

describe("QR fragment encode/decode (M6-T2)", () => {
  it("round-trips script payload through fragment encoding", async () => {
    const fragment = await encodeHandoffFragment("Hello QR", "markdown");
    expect(fragment.startsWith("tp=v1.")).toBe(true);

    const decoded = await decodeHandoffFromHash(`#${fragment}`);
    expect(decoded).toEqual({
      v: 1,
      f: "markdown",
      s: "Hello QR",
    });
  });
});

describe("QrConsume (M6-T3)", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearPrompterStorage();
  });

  it("parses fragment, saves script, and navigates to player", async () => {
    const fragment = await encodeHandoffFragment("QR consume test", "plain");

    render(
      <MemoryRouter initialEntries={[`/handoff/receive#${fragment}`]}>
        <Routes>
          <Route path="/handoff/receive" element={<QrConsume />} />
          <Route path="/play" element={<div data-testid="player-page">Player page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("player-page")).toBeInTheDocument();
    });
    await expect(loadScriptSource()).resolves.toBe("QR consume test");
  });
});

describe("HandoffClaim (M5-T8)", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearPrompterStorage();
    vi.clearAllMocks();
  });

  it("claims script and saves to storage", async () => {
    mockedClaim.mockResolvedValueOnce({ text: "Claimed text", format: "markdown" });

    render(
      <MemoryRouter initialEntries={["/handoff/claim/test-token"]}>
        <Routes>
          <Route path="/handoff/claim/:token" element={<HandoffClaim />} />
          <Route path="/play" element={<div>Player page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/one-time code/i), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /claim and open player/i }));

    await waitFor(() => {
      expect(screen.getByText("Player page")).toBeInTheDocument();
    });

    expect(mockedClaim).toHaveBeenCalledWith("test-token", "123456");
    await expect(loadScriptSource()).resolves.toBe("Claimed text");
  });
});
