import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "../components/ds/Button";
import {
  HandoffReceiveCard,
  HandoffReceiveError,
  HandoffReceiveSection,
} from "../components/ds/HandoffReceiveLayout";
import { en } from "../lib/i18n/en";
import { saveScriptFormat, saveScriptSource } from "../prompter/storage";
import { claimRelaySession, PairingApiError } from "./client";

const titleId = "handoff-claim-title";

export function HandoffClaim() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setError(null);
      if (!/^\d{6}$/.test(otp)) {
        setError(en.handoff.invalidOtp);
        return;
      }

      setSubmitting(true);
      try {
        const claimed = await claimRelaySession(token, otp);
        await saveScriptSource(claimed.text);
        await saveScriptFormat(claimed.format);
        navigate("/play", { replace: true });
      } catch (err) {
        if (err instanceof PairingApiError) {
          setError(err.message);
        } else {
          setError(en.handoff.claimFailed);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [otp, token, navigate],
  );

  if (!token) {
    return (
      <HandoffReceiveSection titleId={titleId} title={en.handoff.claimTitle}>
        <HandoffReceiveCard>
          <HandoffReceiveError message={en.handoff.missingToken} />
        </HandoffReceiveCard>
      </HandoffReceiveSection>
    );
  }

  return (
    <HandoffReceiveSection titleId={titleId} title={en.handoff.claimTitle}>
      <HandoffReceiveCard>
        <p className="tp-handoff-meta">{en.handoff.claimHint}</p>

        <form
          className="tp-handoff-claim-form"
          data-testid="handoff-claim-form"
          onSubmit={(event) => void onSubmit(event)}
        >
          <label className="ds-otp-input__label" htmlFor="handoff-otp">
            {en.handoff.otpLabel}
          </label>
          <input
            id="handoff-otp"
            className="ds-otp-input"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <Button type="submit" variant="primary" size="lg" disabled={submitting}>
            {submitting ? en.handoff.claiming : en.handoff.claimButton}
          </Button>
        </form>

        {error ? <HandoffReceiveError message={error} /> : null}
      </HandoffReceiveCard>
    </HandoffReceiveSection>
  );
}
