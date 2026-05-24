import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  acquireMicStream,
  enumerateMicDevices,
  ensureMicPermission,
  mergeMicDeviceOptions,
  openMicSession,
  readActiveMicDeviceId,
  releaseMicStream,
  resolveMicDeviceFromList,
  resolveMicForSpeech,
} from "../../src/prompter/adaptive/micDevice";

describe("micDevice", () => {
  const stop = vi.fn();

  beforeEach(() => {
    stop.mockClear();
    vi.stubGlobal("navigator", {
      mediaDevices: {
        enumerateDevices: vi.fn(async () => [
          { kind: "audioinput", deviceId: "mic-a", label: "Built-in Mic" },
          { kind: "audiooutput", deviceId: "spk-a", label: "Speakers" },
          { kind: "audioinput", deviceId: "mic-b", label: "heyday Microphone 01 Mono" },
        ]),
        getUserMedia: vi.fn(async (constraints: MediaStreamConstraints) => {
          const audio = constraints.audio;
          if (
            typeof audio === "object" &&
            audio !== null &&
            "deviceId" in audio &&
            typeof audio.deviceId === "object" &&
            audio.deviceId !== null &&
            "exact" in audio.deviceId &&
            audio.deviceId.exact === "missing-mic"
          ) {
            throw new DOMException("Requested device not found", "NotFoundError");
          }
          const deviceId =
            typeof audio === "object" &&
            audio !== null &&
            "deviceId" in audio &&
            typeof audio.deviceId === "object" &&
            audio.deviceId !== null &&
            "exact" in audio.deviceId
              ? String(audio.deviceId.exact)
              : "mic-default";
          return {
            getAudioTracks: () => [{ getSettings: () => ({ deviceId }), stop }],
            getTracks: () => [{ stop }],
          };
        }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists audio input devices with fallback labels", async () => {
    const devices = await enumerateMicDevices();
    expect(devices).toHaveLength(2);
    expect(devices[1]?.label).toBe("heyday Microphone 01 Mono");
  });

  it("openMicSession holds stream for explicit device", async () => {
    const session = await openMicSession("mic-b");
    expect(session.stream).not.toBeNull();
    expect(session.deviceIdUsed).toBe("mic-b");
    releaseMicStream(session.stream);
  });

  it("openMicSession returns null stream for default", async () => {
    const session = await openMicSession("");
    expect(session.stream).toBeNull();
  });

  it("resolveMicDeviceFromList matches by label when id changed", () => {
    const resolved = resolveMicDeviceFromList(
      "old-id",
      "heyday Microphone 01 Mono",
      [{ deviceId: "mic-b", label: "heyday Microphone 01 Mono" }],
    );
    expect(resolved).toEqual({
      deviceId: "mic-b",
      deviceLabel: "heyday Microphone 01 Mono",
      remapped: true,
    });
  });

  it("mergeMicDeviceOptions keeps saved selection in the dropdown", () => {
    const merged = mergeMicDeviceOptions(
      [{ deviceId: "mic-a", label: "Built-in Mic" }],
      "saved-id",
      "heyday Microphone 01 Mono",
    );
    expect(merged[0]?.deviceId).toBe("saved-id");
  });

  it("resolveMicForSpeech remaps by label when id changed", async () => {
    const resolved = await resolveMicForSpeech("missing-mic", "heyday Microphone 01 Mono");
    expect(resolved.remapped).toBe(true);
    expect(resolved.deviceId).toBe("mic-b");
  });

  it("readActiveMicDeviceId reads track settings", () => {
    expect(
      readActiveMicDeviceId({
        getAudioTracks: () => [{ getSettings: () => ({ deviceId: "mic-a" }) }],
      } as MediaStream),
    ).toBe("mic-a");
  });

  it("ensureMicPermission opens and closes a stream", async () => {
    await ensureMicPermission("mic-a");
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });

  it("acquireMicStream uses processing constraints for explicit device", async () => {
    await acquireMicStream("mic-b");
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
        deviceId: { exact: "mic-b" },
      },
    });
  });
});
