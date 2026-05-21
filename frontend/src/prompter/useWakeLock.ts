import { useEffect, useRef } from "react";

/**
 * Keeps the screen awake during active playback when the Wake Lock API is available.
 * Silently no-ops when unsupported or permission denied.
 */
export function useWakeLock(active: boolean): void {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) {
      void lockRef.current?.release();
      lockRef.current = null;
      return;
    }

    if (!("wakeLock" in navigator)) {
      return;
    }

    let cancelled = false;

    void navigator.wakeLock
      .request("screen")
      .then((sentinel) => {
        if (cancelled) {
          void sentinel.release();
          return;
        }
        lockRef.current = sentinel;
      })
      .catch(() => {
        /* unsupported or denied — degrade gracefully */
      });

    return () => {
      cancelled = true;
      void lockRef.current?.release();
      lockRef.current = null;
    };
  }, [active]);
}

/** Test helper — whether wake lock API exists in this environment. */
export function isWakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}
