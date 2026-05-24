import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  HandoffReceiveCard,
  HandoffReceiveError,
  HandoffReceiveLoading,
  HandoffReceiveSection,
} from "../components/ds/HandoffReceiveLayout";
import { en } from "../lib/i18n/en";
import { validateScriptSize } from "../prompter/limits";
import { saveScriptFormat, saveScriptSource } from "../prompter/storage";
import { claimLanHandoff, PairingApiError } from "./client";

const titleId = "handoff-lan-receive-title";

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
    return (
      <HandoffReceiveSection titleId={titleId} title={en.handoff.lanReceiveTitle}>
        <HandoffReceiveCard>
          <HandoffReceiveLoading message={en.handoff.lanConsuming} testId="lan-consuming" />
        </HandoffReceiveCard>
      </HandoffReceiveSection>
    );
  }

  if (error) {
    return (
      <HandoffReceiveSection titleId={titleId} title={en.handoff.lanReceiveTitle}>
        <HandoffReceiveCard>
          <HandoffReceiveError message={error} />
        </HandoffReceiveCard>
      </HandoffReceiveSection>
    );
  }

  return null;
}
