export type MicDeviceOption = {
  deviceId: string;
  label: string;
};

export type MicStreamResult = {
  stream: MediaStream;
  deviceIdUsed: string;
  fellBackToDefault: boolean;
};

export type MicResolveResult = {
  deviceId: string;
  deviceLabel: string;
  remapped: boolean;
  unavailable: boolean;
};

export type MicSessionOpenResult = {
  /** Held for the SR session when a specific device is selected; null = browser default. */
  stream: MediaStream | null;
  deviceIdUsed: string;
};

const SAVED_MIC_FALLBACK_LABEL = "Saved microphone";

const EXPLICIT_MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: true,
};

export function isMediaDevicesSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function isMicDeviceConstraintError(err: unknown): boolean {
  if (!(err instanceof DOMException)) {
    return false;
  }
  return (
    err.name === "NotFoundError" ||
    err.name === "OverconstrainedError" ||
    err.name === "NotReadableError"
  );
}

export function readActiveMicDeviceId(stream: MediaStream): string {
  const track = stream.getAudioTracks()[0];
  return track?.getSettings()?.deviceId?.trim() ?? "";
}

export async function enumerateMicDevices(): Promise<MicDeviceOption[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "audioinput")
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label.trim() || `Microphone ${index + 1}`,
    }));
}

export function resolveMicDeviceFromList(
  micDeviceId: string,
  micDeviceLabel: string,
  devices: readonly MicDeviceOption[],
): Pick<MicResolveResult, "deviceId" | "deviceLabel" | "remapped"> {
  const trimmedId = micDeviceId.trim();
  const trimmedLabel = micDeviceLabel.trim();

  if (trimmedId) {
    const byId = devices.find((device) => device.deviceId === trimmedId);
    if (byId) {
      return { deviceId: byId.deviceId, deviceLabel: byId.label, remapped: false };
    }
  }

  if (trimmedLabel) {
    const byLabel = devices.find((device) => device.label === trimmedLabel);
    if (byLabel) {
      return { deviceId: byLabel.deviceId, deviceLabel: byLabel.label, remapped: true };
    }
  }

  if (trimmedId) {
    return {
      deviceId: trimmedId,
      deviceLabel: trimmedLabel || SAVED_MIC_FALLBACK_LABEL,
      remapped: false,
    };
  }

  return { deviceId: "", deviceLabel: "", remapped: false };
}

export function mergeMicDeviceOptions(
  devices: readonly MicDeviceOption[],
  savedId: string,
  savedLabel: string,
): MicDeviceOption[] {
  const trimmedId = savedId.trim();
  if (!trimmedId || devices.some((device) => device.deviceId === trimmedId)) {
    return [...devices];
  }
  return [
    {
      deviceId: trimmedId,
      label: savedLabel.trim() || SAVED_MIC_FALLBACK_LABEL,
    },
    ...devices,
  ];
}

/** Request mic access so enumerateDevices returns labels (browser privacy rule). */
export async function ensureMicPermission(preferredDeviceId = ""): Promise<void> {
  const { stream } = await acquireMicStream(preferredDeviceId);
  releaseMicStream(stream);
}

export async function acquireMicStream(deviceId: string): Promise<MicStreamResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia not supported");
  }
  const trimmed = deviceId.trim();
  if (trimmed.length > 0) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        ...EXPLICIT_MIC_CONSTRAINTS,
        deviceId: { exact: trimmed },
      },
    });
    return { stream, deviceIdUsed: trimmed, fellBackToDefault: false };
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return {
    stream,
    deviceIdUsed: readActiveMicDeviceId(stream),
    fellBackToDefault: false,
  };
}

/**
 * Resolve saved mic metadata without holding the device open.
 * Opens once for permission/enumeration, then releases.
 */
export async function resolveMicForSpeech(
  micDeviceId: string,
  micDeviceLabel: string,
): Promise<MicResolveResult> {
  const trimmedId = micDeviceId.trim();
  const trimmedLabel = micDeviceLabel.trim();

  if (!trimmedId && !trimmedLabel) {
    return { deviceId: "", deviceLabel: "", remapped: false, unavailable: false };
  }

  try {
    if (trimmedId) {
      const { stream } = await acquireMicStream(trimmedId);
      releaseMicStream(stream);
    } else {
      const { stream } = await acquireMicStream("");
      releaseMicStream(stream);
    }
  } catch {
    if (!trimmedLabel) {
      return {
        deviceId: trimmedId,
        deviceLabel: trimmedLabel,
        remapped: false,
        unavailable: Boolean(trimmedId),
      };
    }
    try {
      const { stream } = await acquireMicStream("");
      releaseMicStream(stream);
    } catch {
      return {
        deviceId: trimmedId,
        deviceLabel: trimmedLabel,
        remapped: false,
        unavailable: Boolean(trimmedId),
      };
    }
  }

  const devices = await enumerateMicDevices();
  const resolved = resolveMicDeviceFromList(trimmedId, trimmedLabel, devices);
  const listed = resolved.deviceId
    ? devices.some((device) => device.deviceId === resolved.deviceId)
    : false;

  return {
    deviceId: resolved.deviceId,
    deviceLabel: resolved.deviceLabel,
    remapped: resolved.remapped,
    unavailable: Boolean(trimmedId) && !listed,
  };
}

/**
 * Open the selected mic and keep it active for the SR session.
 * Pass the stream's audio track to SpeechRecognition.start(track) so SR uses
 * this input instead of the browser default.
 */
export async function openMicSession(deviceId: string): Promise<MicSessionOpenResult> {
  const trimmed = deviceId.trim();
  if (!trimmed) {
    return { stream: null, deviceIdUsed: "" };
  }
  const { stream, deviceIdUsed } = await acquireMicStream(trimmed);
  return { stream, deviceIdUsed };
}

/** Sample RMS level 0–1 from a mic stream (debug / health checks). */
export async function sampleMicLevel(stream: MediaStream, ms = 120): Promise<number> {
  const AudioCtx =
    typeof window !== "undefined"
      ? (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!AudioCtx) {
    return 0;
  }
  const ctx = new AudioCtx();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  const source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);

  await new Promise((resolve) => setTimeout(resolve, ms));
  analyser.getByteTimeDomainData(data);

  let sum = 0;
  for (const sample of data) {
    const normalized = (sample - 128) / 128;
    sum += normalized * normalized;
  }
  const rms = Math.sqrt(sum / data.length);

  source.disconnect();
  await ctx.close();
  return rms;
}

export function releaseMicStream(stream: MediaStream | null): void {
  if (!stream) {
    return;
  }
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

/** @deprecated Use openMicSession; kept for settings permission probe. */
export async function primeMicDevice(deviceId: string): Promise<{
  deviceIdUsed: string;
  fellBackToDefault: boolean;
}> {
  const { stream, deviceIdUsed } = await acquireMicStream(deviceId);
  releaseMicStream(stream);
  return { deviceIdUsed, fellBackToDefault: false };
}
