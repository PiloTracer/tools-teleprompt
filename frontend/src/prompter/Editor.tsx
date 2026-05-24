import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { Button } from "../components/ds/Button";
import { en } from "../lib/i18n/en";
import { isAcceptedFileName, validateScriptSize } from "./limits";

type EditorProps = {
  value: string;
  onChange: (value: string) => void;
  onError?: (message: string) => void;
};

export function Editor({ value, onChange, onError }: EditorProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyText = useCallback(
    (text: string) => {
      const result = validateScriptSize(text);
      if (!result.ok) {
        onError?.(result.message);
        return;
      }
      onChange(text);
    },
    [onChange, onError],
  );

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    applyText(event.target.value);
  };

  const handleFile = (file: File) => {
    if (!isAcceptedFileName(file.name)) {
      onError?.(en.errors.fileType);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      applyText(String(reader.result ?? ""));
    };
    reader.onerror = () => onError?.(en.errors.storage);
    reader.readAsText(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files.item(0);
    if (file) {
      handleFile(file);
    }
  };

  return (
    <section className="tp-editor ds-card" aria-labelledby="tp-editor-label">
      <label id="tp-editor-label" htmlFor="tp-script-input">
        {en.editor.label}
      </label>
      <p id="tp-editor-hint" className="tp-hint">
        {dragOver ? en.editor.dropHint : en.editor.hint}
      </p>
      <details className="tp-hint">
        <summary>{en.editor.metaSummary}</summary>
        <p>{en.editor.metaIntro}</p>
        <ul>
          <li>
            <code>{en.editor.metaBracket}</code>
          </li>
          <li>
            <code>{en.editor.metaParen}</code>
          </li>
          <li>
            <code>{en.editor.metaComment}</code>
          </li>
          <li>
            <code>{en.editor.metaBlockquote}</code>
          </li>
        </ul>
        <p>{en.editor.metaParenNote}</p>
      </details>
      <div
        className={dragOver ? "tp-drop-zone tp-drop-zone--active" : "tp-drop-zone"}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <textarea
          id="tp-script-input"
          className="ds-textarea"
          value={value}
          onChange={handleChange}
          rows={12}
          spellCheck={false}
          aria-describedby="tp-editor-hint"
        />
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          hidden
          onChange={(e) => {
            const file = e.target.files?.item(0);
            if (file) {
              handleFile(file);
            }
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="tp-upload-btn"
          onClick={() => inputRef.current?.click()}
        >
          {en.editor.upload}
        </Button>
      </div>
    </section>
  );
}
