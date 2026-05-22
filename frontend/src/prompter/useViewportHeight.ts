import { useEffect, useState, type RefObject } from "react";

export function useViewportHeight(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) {
      setHeight(0);
      return;
    }

    const update = () => {
      setHeight(el.clientHeight);
    };

    update();
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled]);

  return height;
}
