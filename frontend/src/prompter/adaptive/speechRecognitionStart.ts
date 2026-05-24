export type SpeechRecognitionStartMode = "track" | "default";

export type SpeechRecognitionStartResult =
  | { ok: true; mode: SpeechRecognitionStartMode }
  | { ok: false; error: unknown; trackStartFailed: boolean };

/** Start SR on a live mic track when available (Chrome 135+), else browser default. */
export function startSpeechRecognition(
  rec: SpeechRecognition,
  audioTrack: MediaStreamTrack | null,
): SpeechRecognitionStartResult {
  if (audioTrack && audioTrack.kind === "audio" && audioTrack.readyState === "live") {
    try {
      rec.start(audioTrack);
      return { ok: true, mode: "track" };
    } catch (error) {
      return { ok: false, error, trackStartFailed: true };
    }
  }

  try {
    rec.start();
    return { ok: true, mode: "default" };
  } catch (error) {
    return { ok: false, error, trackStartFailed: false };
  }
}
