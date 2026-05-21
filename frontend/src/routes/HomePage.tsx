import { useCallback, useEffect, useState } from "react";

import { en } from "../lib/i18n/en";
import type { ScriptFormat } from "../markdown/types";
import { Editor } from "../prompter/Editor";
import { Layout } from "../prompter/Layout";
import { Preview } from "../prompter/Preview";
import {
  loadScriptFormat,
  loadScriptSource,
  saveScriptFormat,
  saveScriptSource,
} from "../prompter/storage";

export function HomePage() {
  const [source, setSource] = useState("");
  const [format, setFormat] = useState<ScriptFormat>("plain");
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void Promise.all([loadScriptSource(), loadScriptFormat()]).then(([text, fmt]) => {
      setSource(text);
      setFormat(fmt);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void saveScriptSource(source).catch(() => setError(en.errors.storage));
  }, [source, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void saveScriptFormat(format).catch(() => setError(en.errors.storage));
  }, [format, hydrated]);

  const onSourceChange = useCallback((value: string) => {
    setError(null);
    setSource(value);
  }, []);

  if (!hydrated) {
    return (
      <Layout>
        <p>{en.editor.hint}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="tp-sr-only">{en.appTitle}</h1>
      <div className="tp-home-grid">
        <Editor value={source} onChange={onSourceChange} onError={setError} />
        <Preview source={source} format={format} onFormatChange={setFormat} />
      </div>
      {error ? (
        <p className="tp-error" role="alert">
          {error}
        </p>
      ) : null}
    </Layout>
  );
}
