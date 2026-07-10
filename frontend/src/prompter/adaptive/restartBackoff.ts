/**
 * Backoff delay before restarting SpeechRecognition after Chrome force-ends it.
 *
 * Android Chrome does not support true continuous recognition: `continuous =
 * true` still auto-ends the session after a few seconds of silence
 * (Chromium issue 41297427 / WICG/speech-api#99), and restarting a fresh
 * `SpeechRecognition` instance in `onend` — the only way to keep sync
 * engaged without requiring the user to re-tap the toggle after every pause
 * — makes Android replay its mic connect/disconnect notification (icon +
 * sound) on every restart. There is no web API to suppress that
 * OS-level notification, and no way to keep the mic "on" without
 * restarting: one-shot (no restart) was tried and rejected because sync
 * silently goes idle after any pause, requiring a manual re-tap to resume.
 *
 * The one thing application code controls is *how often* it restarts. While
 * the user hasn't said anything yet (repeated silent cycles right after
 * engaging sync, before they start reading, or during a long pause),
 * backing off the restart delay exponentially spaces out the notification
 * instead of firing it every ~3–5s indefinitely. Any cycle that actually
 * heard speech resets the backoff to the base delay so real reading is
 * never penalized with extra re-acquisition latency.
 */
export const BASE_RESTART_DELAY_MS = 280;
export const MAX_RESTART_BACKOFF_MS = 8000;

export function computeRestartDelayMs(consecutiveSilentRestarts: number): number {
  if (consecutiveSilentRestarts <= 0) {
    return BASE_RESTART_DELAY_MS;
  }
  const scaled = BASE_RESTART_DELAY_MS * 2 ** Math.min(consecutiveSilentRestarts, 6);
  return Math.min(scaled, MAX_RESTART_BACKOFF_MS);
}
