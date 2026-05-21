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
import { fitsQrHandoff } from "./qrThreshold";
import { buildHandoffQrUrl, generateHandoffQrDataUrl } from "./qrEncode";

type HandoffMode = "qr" | "relay";

export function HandoffCreate() {
  const [source, setSource] = useState("");
  const [format, setFormat] = useState<ScriptFormat>("plain");
  const [loading, setLoading] = useState(true);
  const [modeLoading, setModeLoading] = useState(true);
  const [handoffMode, setHandoffMode] = useState<HandoffMode>("relay");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CreateSessionResponse | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrHandoffUrl, setQrHandoffUrl] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([loadScriptSource(), loadScriptFormat()]).then(([text, fmt]) => {
      setSource(text);
      setFormat(fmt);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading || !source.trim()) {
      setModeLoading(false);
      setHandoffMode("relay");
      return;
    }

    let cancelled = false;
    setModeLoading(true);
    void fitsQrHandoff(source, format)
      .then((fits) => {
        if (cancelled) {
          return;
        }
        setHandoffMode(fits ? "qr" : "relay");
        setModeLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setHandoffMode("relay");
          setModeLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loading, source, format]);

  const onCreateRelay = useCallback(async () => {
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

  const onPrepareQr = useCallback(async () => {
    setError(null);
    setQrDataUrl(null);
    setQrHandoffUrl(null);
    const sizeCheck = validateScriptSize(source);
    if (!sizeCheck.ok) {
      setError(sizeCheck.message);
      return;
    }
    if (!source.trim()) {
      setError(en.handoff.emptyScript);
      return;
    }

    setQrGenerating(true);
    try {
      const handoffUrl = await buildHandoffQrUrl(source, format, window.location.origin);
      const dataUrl = await generateHandoffQrDataUrl(handoffUrl);
      setQrHandoffUrl(handoffUrl);
      setQrDataUrl(dataUrl);
    } catch {
      setError(en.handoff.qrFailed);
    } finally {
      setQrGenerating(false);
    }
  }, [source, format]);

  if (loading) {
    return <p>{en.handoff.loading}</p>;
  }

  const modeHint =
    modeLoading
      ? en.handoff.modeDetecting
      : handoffMode === "qr"
        ? en.handoff.modeQr
        : en.handoff.modeRelay;

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
        <>
          <p className="tp-handoff-meta">
            {en.handoff.scriptReady} ({format})
          </p>
          <p className="tp-handoff-meta" data-testid="handoff-mode-hint">
            {modeHint}
          </p>
        </>
      )}

      {handoffMode === "qr" && !modeLoading ? (
        <>
          <button
            type="button"
            onClick={() => void onPrepareQr()}
            disabled={!source.trim() || qrGenerating}
            data-testid="handoff-qr-button"
          >
            {qrGenerating ? en.handoff.generatingQr : en.handoff.createQr}
          </button>
          {qrDataUrl && qrHandoffUrl ? (
            <div className="tp-handoff-result" data-testid="handoff-qr-mode">
              <p>{en.handoff.qrScanHint}</p>
              <img
                src={qrDataUrl}
                alt={en.handoff.qrImageAlt}
                width={256}
                height={256}
                data-testid="handoff-qr-image"
              />
              <p className="tp-handoff-meta">
                <strong>{en.handoff.qrLinkLabel}</strong>
                <br />
                <a href={qrHandoffUrl}>{qrHandoffUrl}</a>
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <button
          type="button"
          onClick={() => void onCreateRelay()}
          disabled={creating || !source.trim() || modeLoading}
          data-testid="handoff-relay-button"
        >
          {creating ? en.handoff.creating : en.handoff.createRelay}
        </button>
      )}

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
