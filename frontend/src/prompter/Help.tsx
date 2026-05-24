import { useEffect, useRef } from "react";

import { en } from "../lib/i18n/en";

type HelpProps = {
  open: boolean;
  disabled?: boolean;
  compact?: boolean;
  onToggle: () => void;
};

export function Help({ open, disabled = false, compact = false, onToggle }: HelpProps) {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      onToggle();
      toggleRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onToggle]);

  return (
    <div className="tp-player-help">
      <button
        ref={toggleRef}
        type="button"
        className="ds-button"
        data-variant="ghost"
        data-size="sm"
        disabled={disabled}
        aria-expanded={open}
        aria-controls="tp-player-help-panel"
        aria-label={compact ? en.play.helpToggleShort : en.play.helpToggle}
        onClick={onToggle}
      >
        {compact ? en.play.helpToggleShort : en.play.helpToggle}
      </button>
      {open ? (
        <div
          ref={panelRef}
          id="tp-player-help-panel"
          className="tp-player-help-panel"
          role="region"
          aria-label={en.play.helpTitle}
          tabIndex={-1}
        >
          <h3>{en.play.helpTitle}</h3>
          <ul>
            <li>{en.play.helpSpace}</li>
            <li>{en.play.helpSpeedUp}</li>
            <li>{en.play.helpSpeedDown}</li>
            <li>{en.play.helpFullscreen}</li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
