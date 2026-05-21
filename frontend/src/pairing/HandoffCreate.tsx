import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { en } from "../lib/i18n/en";
import type { ScriptFormat } from "../markdown/types";
import { DEFAULT_MAX_SCRIPT_BYTES, validateScriptSize } from "../prompter/limits";
import {
  loadScriptFormat,
  loadScriptSource,
} from "../prompter/storage";
import {
  createLanHandoff,
  createRelaySession,
  lanHandoffPageUrl,
  type CreateLanHandoffResponse,
  type CreateSessionResponse,
  PairingApiError,
} from "./client";
import { MultiQrCreate } from "./MultiQrCreate";
import { blocksCrossDeviceHandoff, resolveHandoffOrigin, resolveHandoffOriginAsync } from "./publicOrigin";
import { buildHandoffQrUrl, generateHandoffQrDataUrl, QrGenerationError } from "./qrEncode";
import { type HandoffMode, resolveHandoffMode } from "./qrThreshold";

export function HandoffCreate() {
  const [source, setSource] = useState("");
  const [format, setFormat] = useState<ScriptFormat>("plain");
  const [loading, setLoading] = useState(true);
  const [modeLoading, setModeLoading] = useState(true);
  const [handoffMode, setHandoffMode] = useState<HandoffMode>("relay");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CreateSessionResponse | null>(null);
  const [lanSession, setLanSession] = useState<CreateLanHandoffResponse | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrHandoffUrl, setQrHandoffUrl] = useState<string | null>(null);
  const [handoffOrigin, setHandoffOrigin] = useState(() =>
    resolveHandoffOrigin(window.location.origin),
  );
  const [originLoading, setOriginLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setOriginLoading(true);
    void resolveHandoffOriginAsync(window.location.origin).then((origin) => {
      if (!cancelled) {
        setHandoffOrigin(origin);
        setOriginLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

    const origin = handoffOrigin;
    let cancelled = false;
    setModeLoading(true);
    void resolveHandoffMode(source, format, origin, DEFAULT_MAX_SCRIPT_BYTES)
      .then((mode) => {
        if (cancelled) {
          return;
        }
        setHandoffMode(mode);
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
  }, [loading, source, format, handoffOrigin]);

  const onCreateRelay = useCallback(async () => {
    setError(null);
    setLanSession(null);
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

  const onCreateLan = useCallback(async () => {
    setError(null);
    setSession(null);
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
      const created = await createLanHandoff(source, format);
      setLanSession(created);
    } catch (err) {
      if (err instanceof PairingApiError) {
        setError(err.message);
      } else {
        setError(en.handoff.lanCreateFailed);
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
      const origin = await resolveHandoffOriginAsync(window.location.origin);
      if (blocksCrossDeviceHandoff(origin)) {
        setError(en.handoff.originLoopback);
        return;
      }
      setHandoffOrigin(origin);
      const handoffUrl = await buildHandoffQrUrl(source, format, origin);
      const dataUrl = await generateHandoffQrDataUrl(handoffUrl);
      setQrHandoffUrl(handoffUrl);
      setQrDataUrl(dataUrl);
    } catch (err) {
      if (err instanceof QrGenerationError) {
        const nextMode = await resolveHandoffMode(
          source,
          format,
          handoffOrigin,
          DEFAULT_MAX_SCRIPT_BYTES,
        );
        setHandoffMode(nextMode === "single-qr" ? "multi-qr" : nextMode);
        setError(en.handoff.qrTooLarge);
      } else {
        setError(en.handoff.qrFailed);
      }
    } finally {
      setQrGenerating(false);
    }
  }, [source, format, handoffOrigin]);

  const handoffOriginBlocked = blocksCrossDeviceHandoff(handoffOrigin);

  if (loading) {
    return <p>{en.handoff.loading}</p>;
  }

  const modeHint = modeLoading
    ? en.handoff.modeDetecting
    : handoffMode === "single-qr"
      ? en.handoff.modeQr
      : handoffMode === "multi-qr"
        ? en.handoff.modeMultiQr
        : handoffMode === "lan"
          ? en.handoff.modeLan
          : en.handoff.modeRelay;

  const lanPageUrl = lanSession ? lanHandoffPageUrl(lanSession.token, handoffOrigin) : null;

  return (
    <section aria-labelledby="handoff-create-title">
      <h1 id="handoff-create-title">{en.handoff.createTitle}</h1>
      <p>{en.handoff.createHint}</p>
      <p className="tp-handoff-meta" data-testid="handoff-origin-hint">
        {originLoading
          ? en.handoff.originLoading
          : `${en.handoff.originLabel}: ${handoffOrigin}`}
      </p>
      {handoffOriginBlocked && !originLoading ? (
        <p className="tp-error" role="alert">
          {en.handoff.originLoopback}
        </p>
      ) : null}

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

      {handoffMode === "multi-qr" && !modeLoading && source.trim() ? (
        <div data-testid="handoff-multi-qr-mode">
          <MultiQrCreate />
        </div>
      ) : null}

      {handoffMode === "single-qr" && !modeLoading ? (
        <>
          <button
            type="button"
            onClick={() => void onPrepareQr()}
            disabled={!source.trim() || qrGenerating || originLoading || handoffOriginBlocked}
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
                width={512}
                height={512}
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
      ) : null}

      {handoffMode === "lan" && !modeLoading ? (
        <>
          <button
            type="button"
            onClick={() => void onCreateLan()}
            disabled={creating || !source.trim()}
            data-testid="handoff-lan-button"
          >
            {creating ? en.handoff.lanCreating : en.handoff.lanCreateButton}
          </button>
          {lanSession && lanPageUrl ? (
            <div className="tp-handoff-result" data-testid="handoff-lan-mode">
              <p>{en.handoff.lanOpenHint}</p>
              <p>
                <strong>{en.handoff.lanLinkLabel}</strong>
                <br />
                <a href={lanPageUrl}>{lanPageUrl}</a>
              </p>
              <p className="tp-handoff-meta">
                {en.handoff.expires} {new Date(lanSession.expires_at).toLocaleString()}
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      {handoffMode === "relay" && !modeLoading ? (
        <button
          type="button"
          onClick={() => void onCreateRelay()}
          disabled={creating || !source.trim()}
          data-testid="handoff-relay-button"
        >
          {creating ? en.handoff.creating : en.handoff.createRelay}
        </button>
      ) : null}

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
