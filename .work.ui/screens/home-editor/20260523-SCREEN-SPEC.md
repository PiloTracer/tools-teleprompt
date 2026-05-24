# Home editor — Screen SPEC

**Status:** Implemented  
**Slug:** `home-editor`  
**Route:** `/`  
**UI milestone:** S2  
**Path:** `.work.ui/screens/home-editor/20260523-SCREEN-SPEC.md`  
**Components:** `HomePage`, `Editor`, `Preview` (`frontend/src/routes/HomePage.tsx`, `prompter/Editor.tsx`, `prompter/Preview.tsx`)

---

## 1. Summary

The **home editor** is where users **capture and review** a teleprompter script on the same device: paste, type, upload `.txt`/`.md`, choose plain vs markdown, and see a **live sanitized preview** before opening the player or handoff flows. Entry: app nav **Editor**, brand link, or post-handoff “back to editor.” Primary job on desktop: comfortable two-column edit + preview; on phone: stacked editor-first with full-width preview below.

---

## 2. Personas & jobs

| Persona | Job |
|---------|-----|
| **Desktop presenter** | Paste or drop a long script, verify markdown rendering, then go to Player or Handoff |
| **Mobile solo user** | Type or upload on phone, confirm preview, open Player without handoff |
| **Returning user** | Resume last script and format from local storage |

---

## 3. States

| State | Behaviour | Visual |
|-------|-----------|--------|
| **loading** | Hydrating `tp:script:source` + `tp:script:format` from storage | Skeleton or short hint (`en.editor.hint`); no editor flash of empty |
| **empty** | No script text (allowed) | Empty textarea; preview shows empty sanitized output |
| **success** | Valid script in editor; preview updates on debounce/immediate render | Two regions visible; format radios reflect selection |
| **error — file type** | Non `.txt`/`.md` upload | `role="alert"`: `en.errors.fileType` |
| **error — oversize** | `validateScriptSize` fails | `role="alert"` with byte limit message (domain R1) |
| **error — storage** | `saveScriptSource` / `saveScriptFormat` fails | `role="alert"`: `en.errors.storage` |
| **drag-active** | File dragged over drop zone | `.tp-drop-zone--active` border/background (tokenized in upgrade) |

**Out of scope for this screen:** pairing OTP, QR generation (Handoff screen).

---

## 4. Layout & hierarchy

### Regions (UIS-01)

| Region | Content | Priority |
|--------|---------|----------|
| App shell | Shared `Layout` header + nav (see shell SPEC / S1) | chrome |
| **Editor column** | Label, hint, textarea, upload | primary on mobile |
| **Preview column** | Title, format fieldset, sanitized preview panel | secondary on mobile; equal on desktop |

### Breakpoints

| Viewport | Layout | Notes |
|----------|--------|-------|
| **&lt;768px** | Single column: editor **above** preview | Full-width textarea (min height ~12 rows); preview panel full width |
| **≥768px** | Two-column grid (`1fr 1fr`), gap `--space-6` | Match foundation; avoid narrow editor column from baseline (`tmp/image.png`) |
| **≥960px** | Content constrained `--layout-max-width`, centered | Shell padding `--space-4` / `--space-6` |

### Visual upgrade targets (vs baseline)

- Replace cramped side-by-side with responsive grid and readable editor width on all breakpoints.
- Preview panel: tokenized surface (`--color-bg-surface`), border `--color-border-default`, typography `--font-size-sm` for metadata in preview body.
- Upload control: **primary/secondary button** pattern (≥44px height on mobile).
- Format radios: horizontal pill group or segmented control; visible legend for SR.

### Primary action per viewport

- **Mobile:** focus = edit script (textarea); upload secondary.
- **Desktop:** edit + preview parity; optional sticky “Open player” CTA in shell (future — not required S2 if nav suffices).

---

## 5. Content

| Key / element | Source | Notes |
|---------------|--------|-------|
| Page title (SR) | `en.appTitle` | `h1.tp-sr-only` on `HomePage` |
| Editor label | `en.editor.label` | Associated with `#tp-script-input` |
| Editor hint | `en.editor.hint` | `aria-describedby` on textarea |
| Drop hint (upgrade) | `en.editor.dropHint` | Show when drag-active |
| Preview title | `en.preview.title` | `h2#tp-preview-title` |
| Format plain / markdown | `en.preview.formatPlain`, `en.preview.formatMarkdown` | Fieldset legend SR: “Script format” |
| Upload button | “Upload .txt / .md” | Move to i18n key `en.editor.upload` in implementation |
| Errors | `en.errors.*` | See §3 |

---

## 6. Interactions

| Interaction | Behaviour |
|-------------|-----------|
| Type in textarea | Validate size on change; persist source; update preview |
| Upload button | Hidden file input; accept `.txt`, `.md` |
| Drag-and-drop | Single file on drop zone; prevent default on drag events |
| Format radio | Set `plain` \| `markdown`; persist format; re-render preview |
| Tab order | Editor label → textarea → upload → format radios → preview content (non-interactive) |
| Keyboard | Standard textarea shortcuts; no custom shortcuts on this screen |

**Modals:** none on v1.

**Navigation out:** User opens **Player** (`/play`), **Settings**, or **Handoff** via shell nav — script must already be persisted (R2).

---

## 7. Data dependencies

| Dependency | Link | Use on this screen |
|------------|------|-------------------|
| Prompter UI (R1, R2, R6, R7) | `.work/features/prompter-ui/20260520-SPEC.md` | Editor, persistence, preview rules |
| Markdown render | `.work/features/markdown-render/20260520-SPEC.md` | `renderScript` + `SanitizedHtml` only |
| Storage keys | prompter-ui §5 | `tp:script:source`, `tp:script:format` via `prompter/storage.ts` |
| Max size | `frontend/src/prompter/limits.ts` | 256 KB default — do not change in UI SPEC |

**No API calls** on this screen.

---

## 8. Tokens & components

| Token / component | Spec |
|-------------------|------|
| `--color-bg-surface`, `--color-border-default`, `--color-text-*` | `.work.ui/plans/foundation/20260523-02-design-tokens.md` |
| `--space-*`, `--radius-md`, `--layout-max-width` | same |
| `.tp-home-grid`, `.tp-editor`, `.tp-preview`, `.tp-drop-zone` | Refactor to tokens; keep `tp-` prefix |
| Button (upload) | `components/ds/Button.tsx` — **done** |
| SegmentedControl (format) | `ds-segmented` — **done** |
| Card (editor + preview panels) | `ds-card` — **done** |
| Textarea | `ds-textarea` — **done** |
| SanitizedHtml | **Reuse** — no markup changes |

---

## 9. Accessibility

**Target:** WCAG **2.1 AA** (assumption until `@ui-accessibility-audit`).

- Textarea: visible `<label>` + `aria-describedby` for hint.
- Errors: `role="alert"` on `HomePage` error paragraph (existing).
- Format fieldset: `<legend class="tp-sr-only">` or visible legend.
- Preview: rendered content is **read-only**; container `aria-labelledby="tp-preview-title"`.
- Drag-and-drop: not sole input method — upload button equivalent.
- Touch targets: upload and format controls ≥ **44×44px** on viewports &lt;768px (UIS-02).
- Contrast: preview panel text/background must meet 4.5:1 (UIS-04) in light and dark theme.

---

## 10. Analytics

Optional client events (no script body):

| Event | When |
|-------|------|
| `editor.script.loaded` | Hydration complete |
| `editor.file.uploaded` | Successful file read |
| `editor.format.changed` | `plain` ↔ `markdown` |

---

## 11. Acceptance criteria

- [ ] **R1** Upload `.txt`/`.md`; reject other extensions with `en.errors.fileType`.
- [ ] **R1** Reject script &gt; max bytes with visible error; do not persist oversize text.
- [ ] **R2** Reload `/`; script and format restored from storage.
- [ ] **R6** Markdown preview uses `SanitizedHtml` only; no `dangerouslySetInnerHTML` outside markdown module.
- [ ] **R7** Plain format shows escaped pre-wrapped text in preview.
- [ ] Layout: &lt;768px single column; ≥768px two columns (UIS-02).
- [ ] Drag-over state visible; drop applies file same as upload.
- [ ] All new/changed styles use semantic tokens (no new raw hex).
- [ ] Existing tests pass: `prompter` / `HomePage` / storage tests in container.
- [ ] Visual: compare to upgrade mock direction; baseline reference `tmp/image.png` (before).

---

## 12. Concept / UIS registry

| UIS | Applies | Reason | Status |
|-----|---------|--------|--------|
| UIS-01 | yes | Responsive editor/preview grid; hierarchy | pending |
| UIS-02 | yes | Mobile-first stacking; 44px controls | pending |
| UIS-03 | yes | Drop-zone transition; respect reduced motion | pending |
| UIS-04 | yes | Preview panel contrast (light/dark) | pending |
| UIS-05 | yes | Labels, fieldset, focus order, alerts | pending |
| UIS-06 | yes | Agent implementation of S2 | pending |
| UIS-07 | yes | Craft tier refined — custom format control + upload | pending |

---

## 13. Visual references

| Field | Value |
|-------|-------|
| **exampleIds** | `mobile-controls/C5`, `mobile/C1` |
| **manifestPaths** | `.ai.ui/examples/mobile-controls/manifest.md`, `.ai.ui/examples/mobile/manifest.md` |
| **craftTier** | refined (foundation 01) |
| **beforeScreenshot** | `tmp/image.png`, `tmp/after_some_changes.png` |
| **extractedRules** | See below |
| **regionMap** | Editor column → `C5`; Preview column → `C5`; Format control → `C5` |

### extractedRules (binding)

- Settings-style grouping: label + control with consistent vertical rhythm (`C5`)
- Custom segmented control for format — not bare radio styling (`C5`, player theme pattern)
- Upload as catalog **Button** ≥44px on mobile (`C5`, UIS-02)
- Preview on tokenized elevated surface (`--color-bg-surface` / inset preview well)
- Responsive: &lt;768px stack editor above preview; ≥768px equal columns with `minmax(0, 1fr)` (`mobile/C1`)

| Reference | Path | Notes |
|-----------|------|-------|
| Before (baseline) | `tmp/image.png` | Cramped editor column |
| Broken layout (pre-S2) | `tmp/after_some_changes.png` | Grid min-width fix target |
| Tokens | `frontend/src/styles/tokens.css` | Implementation source |

---

## Implementation notes (brownfield)

- **Do not** change storage keys or `validateScriptSize` logic without domain SPEC amendment.
- **Do** add `en.editor.upload` and wire upload label during `@ui-component-build`.
- Player screen (`player` slug) may ship in S1 before this screen’s visual pass; shell nav must remain consistent.
