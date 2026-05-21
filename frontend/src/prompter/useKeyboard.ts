import { useEffect, useRef } from "react";

export type UseKeyboardOptions = {
  enabled?: boolean;
  onPlayPause: () => void;
  onSpeedUp: () => void;
  onSpeedDown: () => void;
  onToggleFullscreen: () => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/** Desktop shortcuts: space play/pause, +/- speed, f fullscreen (R12). */
export function useKeyboard({
  enabled = true,
  onPlayPause,
  onSpeedUp,
  onSpeedDown,
  onToggleFullscreen,
}: UseKeyboardOptions): void {
  const handlersRef = useRef({
    onPlayPause,
    onSpeedUp,
    onSpeedDown,
    onToggleFullscreen,
  });

  handlersRef.current = {
    onPlayPause,
    onSpeedUp,
    onSpeedDown,
    onToggleFullscreen,
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const { onPlayPause: playPause, onSpeedUp, onSpeedDown, onToggleFullscreen } =
        handlersRef.current;

      if (event.code === "Space") {
        event.preventDefault();
        playPause();
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        onSpeedUp();
        return;
      }
      if (event.key === "-") {
        event.preventDefault();
        onSpeedDown();
        return;
      }
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        onToggleFullscreen();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
