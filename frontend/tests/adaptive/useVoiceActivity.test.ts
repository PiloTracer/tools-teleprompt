import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_VAD_HANGOVER_MS,
  computeTimeDomainRms,
  isVoiceActivitySupported,
  stepVadHangover,
  useVoiceActivity,
  type VadHangoverState,
} from "../../src/prompter/adaptive/useVoiceActivity";

function silentSamples(length: number): Uint8Array {
  return new Uint8Array(length).fill(128);
}

function loudSamples(length: number, amplitude = 64): Uint8Array {
  const data = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    data[i] = i % 2 === 0 ? 128 + amplitude : 128 - amplitude;
  }
  return data;
}

describe("computeTimeDomainRms", () => {
  it("returns 0 for silence (all 128)", () => {
    expect(computeTimeDomainRms(silentSamples(256))).toBe(0);
  });

  it("returns higher RMS for alternating samples", () => {
    const loud = computeTimeDomainRms(loudSamples(256, 80));
    const quiet = computeTimeDomainRms(loudSamples(256, 8));
    expect(loud).toBeGreaterThan(quiet);
    expect(loud).toBeGreaterThan(0.2);
    expect(loud).toBeGreaterThan(0.02);
  });
});

describe("stepVadHangover", () => {
  const threshold = 0.02;
  const hangover = DEFAULT_VAD_HANGOVER_MS;
  const idle: VadHangoverState = {
    speaking: false,
    lastSpeechAtMs: null,
  };

  it("turns on when RMS exceeds threshold", () => {
    const next = stepVadHangover(0.05, threshold, hangover, 1000, idle);
    expect(next.speaking).toBe(true);
    expect(next.lastSpeechAtMs).toBe(1000);
  });

  it("holds speaking during hangover after silence", () => {
    const speaking = stepVadHangover(0.05, threshold, hangover, 1000, idle);
    const withinHangover = stepVadHangover(0, threshold, hangover, 1200, speaking);
    expect(withinHangover.speaking).toBe(true);
  });

  it("turns off after hangover expires", () => {
    const speaking = stepVadHangover(0.05, threshold, hangover, 1000, idle);
    const afterHangover = stepVadHangover(0, threshold, hangover, 1000 + hangover, speaking);
    expect(afterHangover.speaking).toBe(false);
  });
});

describe("useVoiceActivity", () => {
  const getUserMedia = vi.fn();
  let analyserSamples: Uint8Array;
  let audioContextState: AudioContextState;
  const pendingRaf: FrameRequestCallback[] = [];

  function flushRaf(time = 1000): void {
    const cb = pendingRaf.shift();
    cb?.(time);
  }

  beforeEach(() => {
    analyserSamples = silentSamples(2048);
    audioContextState = "running";
    pendingRaf.length = 0;
    getUserMedia.mockReset();
    getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });

    class MockAnalyserNode {
      fftSize = 2048;

      getByteTimeDomainData(arr: Uint8Array): void {
        arr.set(analyserSamples.subarray(0, arr.length));
      }
    }

    class MockAudioContext {
      state = audioContextState;

      createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }));

      createAnalyser = vi.fn(() => new MockAnalyserNode());

      resume = vi.fn(async () => {
        this.state = "running";
      });

      close = vi.fn(async () => undefined);
    }

    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pendingRaf.push(cb);
      return pendingRaf.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not call getUserMedia when enabled is false (I2)", async () => {
    renderHook(() =>
      useVoiceActivity({
        enabled: false,
        listen: true,
      }),
    );

    await waitFor(() => {
      expect(getUserMedia).not.toHaveBeenCalled();
    });
  });

  it("does not call getUserMedia when listen is false", async () => {
    renderHook(() =>
      useVoiceActivity({
        enabled: true,
        listen: false,
      }),
    );

    await waitFor(() => {
      expect(getUserMedia).not.toHaveBeenCalled();
    });
  });

  it("opens mic and reports vadSpeaking false on silence", async () => {
    const { result } = renderHook(() =>
      useVoiceActivity({
        enabled: true,
        listen: true,
        energyThreshold: 0.02,
      }),
    );

    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(result.current.listenActive).toBe(true);
    });

    await act(async () => {
      flushRaf();
    });
    expect(result.current.vadSpeaking).toBe(false);
    expect(result.current.permissionDenied).toBe(false);
  });

  it("reports vadSpeaking true when analyser sees energy", async () => {
    analyserSamples = loudSamples(2048, 90);
    expect(computeTimeDomainRms(analyserSamples)).toBeGreaterThan(0.02);

    const { result } = renderHook(() =>
      useVoiceActivity({
        enabled: true,
        listen: true,
        energyThreshold: 0.02,
      }),
    );

    await waitFor(() => {
      expect(result.current.listenActive).toBe(true);
    });

    await act(async () => {
      flushRaf();
    });

    await waitFor(() => {
      expect(result.current.vadSpeaking).toBe(true);
    });
  });

  it("sets permissionDenied when getUserMedia rejects", async () => {
    getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));

    const { result } = renderHook(() =>
      useVoiceActivity({
        enabled: true,
        listen: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.permissionDenied).toBe(true);
      expect(result.current.error).toBe("permission_denied");
      expect(result.current.listenActive).toBe(false);
    });
  });

  it("reports unsupported when mediaDevices missing", () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });

    expect(isVoiceActivitySupported()).toBe(false);

    const { result } = renderHook(() =>
      useVoiceActivity({
        enabled: true,
        listen: true,
      }),
    );

    expect(result.current.supported).toBe(false);
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
