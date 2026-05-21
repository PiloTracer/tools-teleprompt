import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { en } from "../lib/i18n/en";
import type { ScriptFormat } from "../markdown/types";
import { validateScriptSize } from "../prompter/limits";
import { loadScriptFormat, loadScriptSource } from "../prompter/storage";
import { resolveHandoffOrigin } from "./publicOrigin";
import {
  encodeMultiQrHandoff,
  generateMultiQrDataUrl,
  type MultiQrChunk,
} from "./qrChunkEncode";
import { QrGenerationError } from "./qrEncode";

const copy = {
  title: "Multi-QR handoff",
  hint: "Scan each code in order on your phone. Use Previous / Next to show the next code on this device.",
  generate: "Generate multi-QR codes",
  generating: "Generating codes…",
  failed: "Could not generate multi-QR handoff.",
  tooLarge: "Script is too large for multi-QR handoff.",
  scanProgress: (index: number, total: number) => `Scan code ${index} of ${total}`,
  imageAlt: (index: number, total: number) => `QR code ${index} of ${total}`,
  prev: "Previous code",
  next: "Next code",
} as const;

export function MultiQrCreate() {
  const [source, setSource] = useState("");
  const [format, setFormat] = useState<ScriptFormat>("plain");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chunks, setChunks] = useState<MultiQrChunk[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([loadScriptSource(), loadScriptFormat()]).then(([text, fmt]) => {
      setSource(text);
      setFormat(fmt);
      setLoading(false);
    });
  }, []);

  const generateChunks = useCallback(async () => {
    setError(null);
    setChunks([]);
    setQrDataUrl(null);
    setCurrentIndex(0);

    const sizeCheck = validateScriptSize(source);
    if (!sizeCheck.ok) {
      setError(sizeCheck.message);
      return;
    }
    if (!source.trim()) {
      setError(en.handoff.emptyScript);
      return;
    }

    setGenerating(true);
    try {
      const origin = resolveHandoffOrigin(window.location.origin);
      const encoded = await encodeMultiQrHandoff(source, format, origin);
      setChunks(encoded);
    } catch (err) {
      if (err instanceof QrGenerationError) {
        setError(copy.tooLarge);
      } else {
        setError(copy.failed);
      }
    } finally {
      setGenerating(false);
    }
  }, [source, format]);

  useEffect(() => {
    if (chunks.length === 0) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    const chunk = chunks[currentIndex];
    if (!chunk) {
      return;
    }

    void generateMultiQrDataUrl(chunk.handoffUrl)
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(copy.failed);
          setQrDataUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chunks, currentIndex]);

  if (loading) {
    return <p>{en.handoff.loading}</p>;
  }

  const activeChunk = chunks[currentIndex];
  const total = chunks.length;

  return (
    <section aria-labelledby="multi-qr-create-title">
      <h1 id="multi-qr-create-title">{copy.title}</h1>
      <p>{copy.hint}</p>

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

      <button
        type="button"
        onClick={() => void generateChunks()}
        disabled={!source.trim() || generating}
        data-testid="multi-qr-generate"
      >
        {generating ? copy.generating : copy.generate}
      </button>

      {error ? (
        <p className="tp-error" role="alert">
          {error}
        </p>
      ) : null}

      {activeChunk && qrDataUrl ? (
        <div className="tp-handoff-result" data-testid="multi-qr-mode">
          <p data-testid="multi-qr-progress">
            {copy.scanProgress(activeChunk.index, activeChunk.total)}
          </p>
          <img
            src={qrDataUrl}
            alt={copy.imageAlt(activeChunk.index, activeChunk.total)}
            width={256}
            height={256}
            data-testid="multi-qr-image"
          />
          <p className="tp-handoff-meta">
            <strong>{en.handoff.qrLinkLabel}</strong>
            <br />
            <a href={activeChunk.handoffUrl}>{activeChunk.handoffUrl}</a>
          </p>
          <div className="tp-handoff-nav">
            <button
              type="button"
              onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
              disabled={currentIndex === 0}
              data-testid="multi-qr-prev"
            >
              {copy.prev}
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentIndex((value) => Math.min(total - 1, value + 1))
              }
              disabled={currentIndex >= total - 1}
              data-testid="multi-qr-next"
            >
              {copy.next}
            </button>
          </div>
        </div>
      ) : null}

      <p>
        <Link to="/">{en.handoff.backEditor}</Link>
      </p>
    </section>
  );
}
