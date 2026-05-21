import { en } from "../lib/i18n/en";

type HelpProps = {
  open: boolean;
  onToggle: () => void;
};

export function Help({ open, onToggle }: HelpProps) {
  return (
    <div className="tp-player-help">
      <button type="button" aria-expanded={open} onClick={onToggle}>
        {en.play.helpToggle}
      </button>
      {open ? (
        <div className="tp-player-help-panel" role="region" aria-label={en.play.helpTitle}>
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
