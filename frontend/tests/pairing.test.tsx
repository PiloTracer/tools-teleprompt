import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HandoffClaim } from "../src/pairing/HandoffClaim";
import { HandoffCreate } from "../src/pairing/HandoffCreate";
import { claimRelaySession, createRelaySession } from "../src/pairing/client";
import {
  clearPrompterStorage,
  loadScriptSource,
  saveScriptSource,
} from "../src/prompter/storage";

vi.mock("../src/pairing/client", () => ({
  createRelaySession: vi.fn(),
  claimRelaySession: vi.fn(),
  PairingApiError: class PairingApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

const mockedCreate = vi.mocked(createRelaySession);
const mockedClaim = vi.mocked(claimRelaySession);

describe("HandoffCreate (M5-T8)", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearPrompterStorage();
    vi.clearAllMocks();
  });

  it("creates relay session and shows OTP", async () => {
    await saveScriptSource("My script");
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
      expect(screen.getByRole("button", { name: /create relay session/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /create relay session/i }));

    await waitFor(() => {
      expect(screen.getByTestId("handoff-session")).toBeInTheDocument();
    });
    expect(screen.getByText("654321")).toBeInTheDocument();
    expect(mockedCreate).toHaveBeenCalledWith("My script", "plain");
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
