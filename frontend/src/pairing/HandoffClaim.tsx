import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { en } from "../lib/i18n/en";
import { saveScriptFormat, saveScriptSource } from "../prompter/storage";
import { claimRelaySession, PairingApiError } from "./client";

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
      <p className="tp-error" role="alert">
        {en.handoff.missingToken}
      </p>
    );
  }

  return (
    <section aria-labelledby="handoff-claim-title">
      <h1 id="handoff-claim-title">{en.handoff.claimTitle}</h1>
      <p>{en.handoff.claimHint}</p>

      <form onSubmit={(event) => void onSubmit(event)}>
        <label htmlFor="handoff-otp">{en.handoff.otpLabel}</label>
        <input
          id="handoff-otp"
          name="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? en.handoff.claiming : en.handoff.claimButton}
        </button>
      </form>

      {error ? (
        <p className="tp-error" role="alert">
          {error}
        </p>
      ) : null}

      <p>
        <Link to="/handoff/create">{en.handoff.createTitle}</Link> ·{" "}
        <Link to="/">{en.handoff.backEditor}</Link>
      </p>
    </section>
  );
}
