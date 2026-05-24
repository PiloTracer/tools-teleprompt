import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  HandoffReceiveCard,
  HandoffReceiveError,
  HandoffReceiveLoading,
  HandoffReceiveSection,
} from "../components/ds/HandoffReceiveLayout";
import { en } from "../lib/i18n/en";
import { validateScriptSize } from "../prompter/limits";
import { saveScriptFormat, saveScriptSource } from "../prompter/storage";
import { decodeHandoffFromHash, HandoffDecodeError } from "./qrDecode";

const titleId = "handoff-qr-receive-title";

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
    return (
      <HandoffReceiveSection titleId={titleId} title={en.handoff.qrReceiveTitle}>
        <HandoffReceiveCard>
          <HandoffReceiveLoading message={en.handoff.qrConsuming} />
        </HandoffReceiveCard>
      </HandoffReceiveSection>
    );
  }

  if (error) {
    return (
      <HandoffReceiveSection titleId={titleId} title={en.handoff.qrReceiveTitle}>
        <HandoffReceiveCard>
          <HandoffReceiveError message={error} />
        </HandoffReceiveCard>
      </HandoffReceiveSection>
    );
  }

  return null;
}
