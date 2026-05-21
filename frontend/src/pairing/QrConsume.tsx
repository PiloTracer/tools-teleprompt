import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { en } from "../lib/i18n/en";
import { validateScriptSize } from "../prompter/limits";
import { saveScriptFormat, saveScriptSource } from "../prompter/storage";
import { decodeHandoffFromHash, HandoffDecodeError } from "./qrDecode";

export function QrConsume() {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function consume() {
      try {
        const payload = await decodeHandoffFromHash(location.hash);
        if (!payload) {
          if (!cancelled) {
            setError(en.handoff.qrMissingFragment);
            setLoading(false);
          }
          return;
        }

        const sizeCheck = validateScriptSize(payload.s);
        if (!sizeCheck.ok) {
          if (!cancelled) {
            setError(sizeCheck.message);
            setLoading(false);
          }
          return;
        }

        await saveScriptSource(payload.s);
        await saveScriptFormat(payload.f);
        if (!cancelled) {
          navigate("/play", { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof HandoffDecodeError
              ? en.handoff.qrInvalidFragment
              : en.handoff.qrConsumeFailed,
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

  if (loading && !error) {
    return <p>{en.handoff.qrConsuming}</p>;
  }

  if (error) {
    return (
      <section aria-labelledby="handoff-qr-receive-title">
        <h1 id="handoff-qr-receive-title">{en.handoff.qrReceiveTitle}</h1>
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
