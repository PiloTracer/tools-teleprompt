import { useCallback, useEffect, useState } from "react";

import { Button } from "../components/ds/Button";
import { HandoffResultCard } from "../components/ds/HandoffResultCard";
import { HandoffStepIndicator } from "../components/ds/HandoffStepIndicator";
import { QrFrame } from "../components/ds/QrFrame";
import { en } from "../lib/i18n/en";
import type { ScriptFormat } from "../markdown/types";
import { validateScriptSize } from "../prompter/limits";
import { loadScriptFormat, loadScriptSource } from "../prompter/storage";
import { blocksCrossDeviceHandoff, resolveHandoffOriginAsync } from "./publicOrigin";
import {
  encodeMultiQrHandoff,
  generateMultiQrDataUrl,
  type MultiQrChunk,
} from "./qrChunkEncode";
import { QrGenerationError } from "./qrEncode";

export type MultiQrCreateProps = {
  /** When true, omit page title (parent HandoffCreate owns h1). */
  embedded?: boolean;
};

export function MultiQrCreate({ embedded = false }: MultiQrCreateProps) {
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
      const origin = await resolveHandoffOriginAsync(window.location.origin);
      if (blocksCrossDeviceHandoff(origin)) {
        setError(en.handoff.originLoopback);
        return;
      }
      const encoded = await encodeMultiQrHandoff(source, format, origin);
      setChunks(encoded);
    } catch (err) {
      if (err instanceof QrGenerationError) {
        setError(en.handoff.multiTooLarge);
      } else {
        setError(en.handoff.multiFailed);
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
          setError(en.handoff.multiFailed);
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
  const TitleTag = embedded ? "h2" : "h1";
  const titleId = embedded ? "multi-qr-create-subtitle" : "multi-qr-create-title";

  return (
    <section
      className="tp-handoff-multi"
      aria-labelledby={titleId}
      data-testid={embedded ? "handoff-multi-embedded" : undefined}
    >
      <TitleTag id={titleId} className={embedded ? "tp-handoff-page__hint" : "tp-handoff-page__title"}>
        {en.handoff.multiTitle}
      </TitleTag>
      {!embedded ? <p className="tp-handoff-page__hint">{en.handoff.multiHint}</p> : null}

      {!embedded && !source.trim() ? (
        <p className="tp-handoff-meta">{en.handoff.noScript}</p>
      ) : null}

      {!embedded && source.trim() ? (
        <p className="tp-handoff-meta">
          {en.handoff.scriptReady} ({format})
        </p>
      ) : null}

      <Button
        type="button"
        variant="primary"
        onClick={() => void generateChunks()}
        disabled={!source.trim() || generating}
        data-testid="multi-qr-generate"
      >
        {generating ? en.handoff.multiGenerating : en.handoff.multiGenerate}
      </Button>

      {error ? (
        <p className="ds-alert" data-variant="error" role="alert">
          {error}
        </p>
      ) : null}

      {activeChunk && qrDataUrl ? (
        <HandoffResultCard
          variant="qr"
          testId="multi-qr-mode"
          url={activeChunk.handoffUrl}
          urlLabel={en.handoff.qrLinkLabel}
        >
          <HandoffStepIndicator
            index={activeChunk.index}
            total={activeChunk.total}
            label={en.handoff.multiScanProgress(activeChunk.index, activeChunk.total)}
          />
          <QrFrame
            src={qrDataUrl}
            alt={en.handoff.multiImageAlt(activeChunk.index, activeChunk.total)}
            imageTestId="multi-qr-image"
          />
          <div className="tp-handoff-nav">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
              disabled={currentIndex === 0}
              data-testid="multi-qr-prev"
            >
              {en.handoff.multiPrev}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurrentIndex((value) => Math.min(total - 1, value + 1))}
              disabled={currentIndex >= total - 1}
              data-testid="multi-qr-next"
            >
              {en.handoff.multiNext}
            </Button>
          </div>
        </HandoffResultCard>
      ) : null}
    </section>
  );
}
