import { useEffect, useRef, useState } from "react";

/**
 * Debounced silence hangover after last speech frame.
 *
 * 700 ms covers natural intra-sentence pauses (commas, breaths) without
 * keeping the scroll alive long after the reader actually stopped.  The
 * previous 1200 ms felt sluggish — the prompter kept advancing for over
 * a second after silence, which violated Rule 4 in practice.
 */
export const DEFAULT_VAD_HANGOVER_MS = 700;

/** RMS energy threshold on normalized time-domain samples (0–1). */
export const DEFAULT_VAD_ENERGY_THRESHOLD = 0.022;

/** Consecutive above-threshold frames required before marking speech (reduces room noise). */
export const DEFAULT_VAD_ONSET_FRAMES = 4;

export type VoiceActivityError = "permission_denied" | "audio_unavailable" | "pipeline_error";

export type UseVoiceActivityOptions = {
  /** Master gate — when false, zero getUserMedia (adaptive SPEC I2). */
  enabled: boolean;
  /** Open mic and run VAD when true (sync active / auto-sync). */
  listen: boolean;
  hangoverMs?: number;
  energyThreshold?: number;
  onsetFrames?: number;
  onError?: (code: VoiceActivityError) => void;
};

export type UseVoiceActivityResult = {
  listenActive: boolean;
  vadSpeaking: boolean;
  permissionDenied: boolean;
  error: VoiceActivityError | null;
  supported: boolean;
};

export type VadHangoverState = {
  speaking: boolean;
  lastSpeechAtMs: number | null;
  consecutiveAbove: number;
};

/** RMS of byte time-domain samples from AnalyserNode (128 = silence). */
export function computeTimeDomainRms(byteData: Uint8Array): number {
  if (byteData.length === 0) {
    return 0;
  }
  let sumSquares = 0;
  for (let i = 0; i < byteData.length; i += 1) {
    const sample = (byteData[i] - 128) / 128;
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / byteData.length);
}

/** Apply energy threshold with onset + hangover debounce (adaptive SPEC R7–R8). */
export function stepVadHangover(
  rms: number,
  threshold: number,
  hangoverMs: number,
  nowMs: number,
  prev: VadHangoverState,
  onsetFrames = DEFAULT_VAD_ONSET_FRAMES,
): VadHangoverState {
  if (rms >= threshold) {
    const consecutiveAbove = prev.consecutiveAbove + 1;
    if (prev.speaking || consecutiveAbove >= onsetFrames) {
      return { speaking: true, lastSpeechAtMs: nowMs, consecutiveAbove };
    }
    return {
      speaking: false,
      lastSpeechAtMs: prev.lastSpeechAtMs,
      consecutiveAbove,
    };
  }
  if (
    prev.speaking &&
    prev.lastSpeechAtMs !== null &&
    nowMs - prev.lastSpeechAtMs < hangoverMs
  ) {
    return { ...prev, consecutiveAbove: 0 };
  }
  return { speaking: false, lastSpeechAtMs: prev.lastSpeechAtMs, consecutiveAbove: 0 };
}

function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const w = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? w.webkitAudioContext;
}

function isMediaDevicesSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/** Whether mic + Web Audio VAD can run in this environment. */
export function isVoiceActivitySupported(): boolean {
  return isMediaDevicesSupported() && getAudioContextCtor() !== undefined;
}

/**
 * Browser mic + Web Audio voice-activity detection (adaptive SPEC R7).
 * Device-local only; no audio leaves the client (I1).
 */
export function useVoiceActivity({
  enabled,
  listen,
  hangoverMs = DEFAULT_VAD_HANGOVER_MS,
  energyThreshold = DEFAULT_VAD_ENERGY_THRESHOLD,
  onsetFrames = DEFAULT_VAD_ONSET_FRAMES,
  onError,
}: UseVoiceActivityOptions): UseVoiceActivityResult {
  const supported = isVoiceActivitySupported();
  const [listenActive, setListenActive] = useState(false);
  const [vadSpeaking, setVadSpeaking] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<VoiceActivityError | null>(null);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled || !listen || !supported) {
      setListenActive(false);
      setVadSpeaking(false);
      if (!enabled) {
        setPermissionDenied(false);
        setError(null);
      }
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let rafId: number | null = null;
    let vadState: VadHangoverState = {
      speaking: false,
      lastSpeechAtMs: null,
      consecutiveAbove: 0,
    };
    const sampleBuffer = new Uint8Array(2048);

    const reportError = (code: VoiceActivityError) => {
      if (cancelled) {
        return;
      }
      setError(code);
      if (code === "permission_denied") {
        setPermissionDenied(true);
      }
      onErrorRef.current?.(code);
    };

    const cleanup = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      stream?.getTracks().forEach((track) => {
        track.stop();
      });
      stream = null;
      analyser = null;
      void audioContext?.close();
      audioContext = null;
      vadState = { speaking: false, lastSpeechAtMs: null, consecutiveAbove: 0 };
      setListenActive(false);
      setVadSpeaking(false);
    };

    const analyze = (time: number) => {
      if (cancelled || !analyser) {
        return;
      }

      analyser.getByteTimeDomainData(sampleBuffer);
      const rms = computeTimeDomainRms(sampleBuffer);
      vadState = stepVadHangover(
        rms,
        energyThreshold,
        hangoverMs,
        time,
        vadState,
        onsetFrames,
      );
      setVadSpeaking(vadState.speaking);
      rafId = requestAnimationFrame(analyze);
    };

    const start = async () => {
      setError(null);
      setPermissionDenied(false);

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        reportError("permission_denied");
        cleanup();
        return;
      }

      if (cancelled) {
        cleanup();
        return;
      }

      const AudioCtx = getAudioContextCtor();
      if (!AudioCtx) {
        reportError("audio_unavailable");
        cleanup();
        return;
      }

      try {
        audioContext = new AudioCtx();
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
      } catch {
        reportError("pipeline_error");
        cleanup();
        return;
      }

      if (cancelled) {
        cleanup();
        return;
      }

      setListenActive(true);
      vadState = { speaking: false, lastSpeechAtMs: null, consecutiveAbove: 0 };
      setVadSpeaking(false);
      rafId = requestAnimationFrame(analyze);
    };

    void start();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [enabled, listen, supported, hangoverMs, energyThreshold, onsetFrames]);

  return {
    listenActive,
    vadSpeaking,
    permissionDenied,
    error,
    supported,
  };
}
