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
    consecutiveAbove: 0,
  };

  function speechOnsetAt(time: number): VadHangoverState {
    let state = idle;
    for (let frame = 0; frame < 4; frame += 1) {
      state = stepVadHangover(0.05, threshold, hangover, time + frame, state);
    }
    return state;
  }

  it("turns on after consecutive above-threshold frames", () => {
    const speaking = speechOnsetAt(1000);
    expect(speaking.speaking).toBe(true);
    expect(speaking.lastSpeechAtMs).toBe(1003);
  });

  it("does not turn on from a single loud frame", () => {
    const next = stepVadHangover(0.05, threshold, hangover, 1000, idle);
    expect(next.speaking).toBe(false);
  });

  it("holds speaking during hangover after silence", () => {
    const speaking = speechOnsetAt(1000);
    const withinHangover = stepVadHangover(0, threshold, hangover, 1200, speaking);
    expect(withinHangover.speaking).toBe(true);
  });

  it("turns off after hangover expires", () => {
    const speaking = speechOnsetAt(1000);
    expect(speaking.lastSpeechAtMs).not.toBeNull();
    const afterHangover = stepVadHangover(
      0,
      threshold,
      hangover,
      speaking.lastSpeechAtMs! + hangover,
      speaking,
    );
    expect(afterHangover.speaking).toBe(false);
  });
});

describe("useVoiceActivity", () => {
  const getUserMedia = vi.fn();
  let analyserSamples: Uint8Array;
  let audioContextState: AudioContextState;
  const rafCallbacks = new Map<number, FrameRequestCallback>();
  let nextRafId = 0;

  function flushRaf(time = 1000): void {
    const [id] = rafCallbacks.keys();
    if (id === undefined) {
      return;
    }
    const cb = rafCallbacks.get(id);
    rafCallbacks.delete(id);
    cb?.(time);
  }

  beforeEach(() => {
    analyserSamples = silentSamples(2048);
    audioContextState = "running";
    rafCallbacks.clear();
    nextRafId = 0;
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
      nextRafId += 1;
      rafCallbacks.set(nextRafId, cb);
      return nextRafId;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      rafCallbacks.delete(id);
    });
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

  it("marks speech when analyser RMS exceeds threshold (pipeline math)", () => {
    analyserSamples = loudSamples(2048, 90);
    const rms = computeTimeDomainRms(analyserSamples);
    expect(rms).toBeGreaterThan(0.02);

    let state: VadHangoverState = {
      speaking: false,
      lastSpeechAtMs: null,
      consecutiveAbove: 0,
    };
    for (let frame = 0; frame < 4; frame += 1) {
      state = stepVadHangover(rms, 0.02, DEFAULT_VAD_HANGOVER_MS, 1000 + frame, state, 1);
    }
    expect(state.speaking).toBe(true);
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
