import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { en } from "../lib/i18n/en";
import { validateScriptSize } from "../prompter/limits";
import { saveScriptFormat, saveScriptSource } from "../prompter/storage";
import {
  ingestMultiQrFragment,
  MultiQrDecodeError,
} from "./qrChunkDecode";
import { HandoffDecodeError } from "./qrDecode";

const copy = {
  receiveTitle: "Receive script (multi-QR)",
  consuming: "Loading multi-QR handoff…",
  missingFragment: "No multi-QR handoff data found in this link.",
  invalidFragment: "This multi-QR link is invalid or corrupted.",
  consumeFailed: "Could not load script from multi-QR handoff.",
  pendingProgress: (received: number, total: number) =>
    `Received ${received} of ${total} codes.`,
  pendingHint: "Scan the remaining codes on this device to finish loading the script.",
} as const;

export function MultiQrConsume() {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ received: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function consume() {
      try {
        const result = await ingestMultiQrFragment(location.hash);
        if (!result) {
          if (!cancelled) {
            setError(copy.missingFragment);
            setLoading(false);
          }
          return;
        }

        if (result.status === "pending") {
          if (!cancelled) {
            setPending({ received: result.received, total: result.total });
            setLoading(false);
          }
          return;
        }

        const sizeCheck = validateScriptSize(result.payload.s);
        if (!sizeCheck.ok) {
          if (!cancelled) {
            setError(sizeCheck.message);
            setLoading(false);
          }
          return;
        }

        await saveScriptSource(result.payload.s);
        await saveScriptFormat(result.payload.f);
        if (!cancelled) {
          navigate("/play", { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof MultiQrDecodeError || err instanceof HandoffDecodeError
              ? copy.invalidFragment
              : copy.consumeFailed,
          );
          setLoading(false);
        }
      }
    }

    void consume();

    return () => {
      cancelled = true;
    };
  }, [location.hash, navigate]);

  if (loading && !error && !pending) {
    return <p data-testid="multi-qr-consuming">{copy.consuming}</p>;
  }

  if (pending) {
    return (
      <section aria-labelledby="multi-qr-receive-title">
        <h1 id="multi-qr-receive-title">{copy.receiveTitle}</h1>
        <p data-testid="multi-qr-pending">
          {copy.pendingProgress(pending.received, pending.total)}
        </p>
        <p>{copy.pendingHint}</p>
        <p>
          <Link to="/">{en.handoff.backEditor}</Link>
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-labelledby="multi-qr-receive-title">
        <h1 id="multi-qr-receive-title">{copy.receiveTitle}</h1>
        <p className="tp-error" role="alert">
          {error}
        </p>
        <p>
          <Link to="/">{en.handoff.backEditor}</Link>
        </p>
      </section>
    );
  }

  return null;
}
