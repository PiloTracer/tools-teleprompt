import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { HandoffStepIndicator } from "../components/ds/HandoffStepIndicator";
import {
  HandoffReceiveCard,
  HandoffReceiveError,
  HandoffReceiveLoading,
  HandoffReceiveSection,
} from "../components/ds/HandoffReceiveLayout";
import { en } from "../lib/i18n/en";
import { validateScriptSize } from "../prompter/limits";
import { saveScriptFormat, saveScriptSource } from "../prompter/storage";
import {
  ingestMultiQrFragment,
  MultiQrDecodeError,
} from "./qrChunkDecode";
import { HandoffDecodeError } from "./qrDecode";

const titleId = "handoff-multi-receive-title";

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
            setError(en.handoff.multiMissingFragment);
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
          if (err instanceof MultiQrDecodeError || err instanceof HandoffDecodeError) {
            setError(en.handoff.multiInvalidFragment);
          } else {
            setError(en.handoff.multiConsumeFailed);
          }
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
    return (
      <HandoffReceiveSection titleId={titleId} title={en.handoff.multiReceiveTitle}>
        <HandoffReceiveCard>
          <HandoffReceiveLoading message={en.handoff.multiConsuming} />
        </HandoffReceiveCard>
      </HandoffReceiveSection>
    );
  }

  if (pending) {
    return (
      <HandoffReceiveSection titleId={titleId} title={en.handoff.multiReceiveTitle}>
        <HandoffReceiveCard className="tp-handoff-panel" testId="multi-qr-pending">
          <HandoffStepIndicator
            index={pending.received}
            total={pending.total}
            label={en.handoff.multiPendingProgress(pending.received, pending.total)}
          />
          <p className="tp-handoff-meta">{en.handoff.multiPendingHint}</p>
        </HandoffReceiveCard>
      </HandoffReceiveSection>
    );
  }

  if (error) {
    return (
      <HandoffReceiveSection titleId={titleId} title={en.handoff.multiReceiveTitle}>
        <HandoffReceiveCard>
          <HandoffReceiveError message={error} />
        </HandoffReceiveCard>
      </HandoffReceiveSection>
    );
  }

  return null;
}
