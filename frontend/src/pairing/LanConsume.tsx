import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { en } from "../lib/i18n/en";
import { validateScriptSize } from "../prompter/limits";
import { saveScriptFormat, saveScriptSource } from "../prompter/storage";
import { claimLanHandoff, PairingApiError } from "./client";

export function LanConsume() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError(en.handoff.missingToken);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function consume() {
      try {
        const payload = await claimLanHandoff(token);
        const sizeCheck = validateScriptSize(payload.text);
        if (!sizeCheck.ok) {
          if (!cancelled) {
            setError(sizeCheck.message);
            setLoading(false);
          }
          return;
        }

        await saveScriptSource(payload.text);
        await saveScriptFormat(payload.format);
        if (!cancelled) {
          navigate("/play", { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof PairingApiError) {
            if (err.status === 410) {
              setError(en.handoff.lanAlreadyClaimed);
            } else if (err.status === 404) {
              setError(en.handoff.lanExpired);
            } else {
              setError(err.message);
            }
          } else {
            setError(en.handoff.lanConsumeFailed);
          }
          setLoading(false);
        }
      }
    }

    void consume();

    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  if (loading && !error) {
    return <p data-testid="lan-consuming">{en.handoff.lanConsuming}</p>;
  }

  if (error) {
    return (
      <section aria-labelledby="handoff-lan-receive-title">
        <h1 id="handoff-lan-receive-title">{en.handoff.lanReceiveTitle}</h1>
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
