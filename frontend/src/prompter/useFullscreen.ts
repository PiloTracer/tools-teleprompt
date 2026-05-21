import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type UseFullscreenResult = {
  targetRef: RefObject<HTMLElement | null>;
  isFullscreen: boolean;
  isSupported: boolean;
  toggleFullscreen: () => Promise<void>;
};

export function useFullscreen(): UseFullscreenResult {
  const targetRef = useRef<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSupported =
    typeof document !== "undefined" && document.documentElement.requestFullscreen !== undefined;

  useEffect(() => {
    const onChange = () => {
      const active = document.fullscreenElement === targetRef.current;
      setIsFullscreen(active);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = targetRef.current;
    if (!el || !isSupported) {
      return;
    }
    if (document.fullscreenElement === el) {
      await document.exitFullscreen();
      return;
    }
    await el.requestFullscreen();
  }, [isSupported]);

  return { targetRef, isFullscreen, isSupported, toggleFullscreen };
}
