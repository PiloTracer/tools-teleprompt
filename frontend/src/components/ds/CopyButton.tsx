import { useCallback, useId, useState } from "react";

import { en } from "../../lib/i18n/en";
import { Button } from "./Button";

export type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

export function CopyButton({ text, label = en.handoff.copyLink, className }: CopyButtonProps) {
  const statusId = useId();
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("ok");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("fail");
      window.setTimeout(() => setStatus("idle"), 3000);
    }
  }, [text]);

  return (
    <span className={className ? `ds-copy-button ${className}` : "ds-copy-button"}>
      <Button type="button" variant="secondary" size="sm" onClick={() => void onCopy()}>
        {label}
      </Button>
      {status !== "idle" ? (
        <span
          id={statusId}
          className="ds-copy-button__status"
          role="status"
          aria-live="polite"
        >
          {status === "ok" ? en.handoff.copySuccess : en.handoff.copyFailed}
        </span>
      ) : null}
    </span>
  );
}
