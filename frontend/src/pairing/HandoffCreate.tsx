import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { en } from "../lib/i18n/en";
import type { ScriptFormat } from "../markdown/types";
import { validateScriptSize } from "../prompter/limits";
import {
  loadScriptFormat,
  loadScriptSource,
} from "../prompter/storage";
import { createRelaySession, type CreateSessionResponse, PairingApiError } from "./client";

export function HandoffCreate() {
  const [source, setSource] = useState("");
  const [format, setFormat] = useState<ScriptFormat>("plain");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CreateSessionResponse | null>(null);

  useEffect(() => {
    void Promise.all([loadScriptSource(), loadScriptFormat()]).then(([text, fmt]) => {
      setSource(text);
      setFormat(fmt);
      setLoading(false);
    });
  }, []);

  const onCreate = useCallback(async () => {
    setError(null);
    const sizeCheck = validateScriptSize(source);
    if (!sizeCheck.ok) {
      setError(sizeCheck.message);
      return;
    }
    if (!source.trim()) {
      setError(en.handoff.emptyScript);
      return;
    }

    setCreating(true);
    try {
      const created = await createRelaySession(source, format);
      setSession(created);
    } catch (err) {
      if (err instanceof PairingApiError) {
        setError(err.message);
      } else {
        setError(en.handoff.createFailed);
      }
    } finally {
      setCreating(false);
    }
  }, [source, format]);

  if (loading) {
    return <p>{en.handoff.loading}</p>;
  }

  return (
    <section aria-labelledby="handoff-create-title">
      <h1 id="handoff-create-title">{en.handoff.createTitle}</h1>
      <p>{en.handoff.createHint}</p>

      {!source.trim() ? (
        <p>
          {en.handoff.noScript}{" "}
          <Link to="/">{en.handoff.backEditor}</Link>
        </p>
      ) : (
        <p className="tp-handoff-meta">
          {en.handoff.scriptReady} ({format})
        </p>
      )}

      <button type="button" onClick={() => void onCreate()} disabled={creating || !source.trim()}>
        {creating ? en.handoff.creating : en.handoff.createRelay}
      </button>

      {error ? (
        <p className="tp-error" role="alert">
          {error}
        </p>
      ) : null}

      {session ? (
        <div className="tp-handoff-result" data-testid="handoff-session">
          <p>
            <strong>{en.handoff.claimUrl}</strong>
            <br />
            <a href={session.claim_url}>{session.claim_url}</a>
          </p>
          <p>
            <strong>{en.handoff.otpLabel}</strong> {session.otp}
          </p>
          <p className="tp-handoff-meta">
            {en.handoff.expires} {new Date(session.expires_at).toLocaleString()}
          </p>
        </div>
      ) : null}

      <p>
        <Link to="/">{en.handoff.backEditor}</Link>
      </p>
    </section>
  );
}
