# Design system catalog — tools-teleprompt

**Updated:** 2026-05-25 · **Path:** `.work.ui/design-system/CATALOG.md`  
**Stack:** vanilla-css · **Tokens:** `frontend/src/styles/tokens.css`  
**Prefix:** `ds-` (new primitives) · `tp-` (brownfield — migrate incrementally)  
**Storybook:** n/a v1 (`DOCS_UI_STACK.md`) — stories deferred; document variants here before use

**Source:** `@ui-design-system init` from foundation doc 03 + screen SPECs S1–S4.

---

## Conventions

| Topic | Rule |
|-------|------|
| **CSS location** | `frontend/src/styles/components/ds-<name>.css` imported from `main.tsx` or feature CSS |
| **React wrappers** | `frontend/src/components/ds/<Name>.tsx` only when props/slots needed |
| **Variants API** | `data-variant`, `data-size` on host element (vanilla-css — no runtime CSS-in-JS) |
| **Touch** | `--size-touch-min: 44px` on interactive targets (mobile) |
| **Add flow** | `@ui-design-system add - <component>` → file + catalog row + tests |

---

## Primitives

| Component | Tier | Path (planned) | Variants | Storybook | a11y notes | Milestone | Status |
|-----------|------|----------------|----------|-----------|------------|-----------|--------|
| **Button** | primitive | `styles/components/ds-button.css` · [Button.md](./Button.md) · `components/ds/Button.tsx` | `primary`, `secondary`, `ghost`; sizes `sm`, `md`, `lg`, `compact` | n/a | Native `<button>`; visible focus; `aria-pressed` for toggles | S1 | **done** |
| **IconButton** | primitive | `styles/components/ds-button.css` (ghost) | `ghost`; sizes `sm`, `md` | n/a | Required `aria-label`; min 44×44px hit area | S1 | **done** |
| **RangeSlider** | primitive | `styles/components/ds-range.css` | default; optional `compact` | n/a | Native `input[type=range]` + label + value; `aria-valuemin/max/now` | S1 | **done** |
| **Select** | primitive | `styles/components/ds-select.css` | default | n/a | Associated label; keyboard native | S1 | **done** |
| **Checkbox** | primitive | `styles/components/ds-checkbox.css` | default | n/a | Label association; 44px row on mobile | S1 | **done** |
| **Toggle** | primitive | `styles/components/ds-toggle.css` · [Toggle.md](./Toggle.md) · `components/ds/Toggle.tsx` | `default`, `compact` | n/a | `role="switch"`; label left / control right; ≥44px row (`default`) | S3 | **done** |
| **Textarea** | primitive | `styles/components/ds-textarea.css` | default | n/a | Label + `aria-describedby` for hints | S2 | **done** |
| **SegmentedControl** | primitive | `styles/components/ds-segmented.css` | 2–4 options | n/a | `role="radiogroup"`; radio options | S1 | **done** (player theme) |
| **CopyButton** | primitive | `components/ds/CopyButton.tsx` + CSS | default | n/a | Success `role="status"`; clipboard fail alert | S4 | **done** |

---

## Layout & patterns

| Component | Tier | Path (planned) | Variants | Storybook | a11y notes | Milestone | Status |
|-----------|------|----------------|----------|-----------|------------|-----------|--------|
| **AppShell** | layout | `prompter/Layout.tsx`, `.tp-layout*` | top-nav (≥768px), bottom-nav (<768px) | n/a | Skip link slot; nav `aria-label="Primary"`; active state | S1 | **done** |
| **MobileNav** | layout | `ds-mobile-nav.css` | 4 items max | n/a | Current route; 44px tabs | S1 | **done** |
| **PlayerToolbar** | layout | `.tp-player-toolbar*` tokenized | windowed, fullscreen-bottom | n/a | `role="toolbar"`; control grouping | S1 | **done** |
| **BottomSheet** | layout | `components/ds/BottomSheet.tsx` | default | n/a | Focus trap; Escape closes; restore focus | S1/P1 | planned |
| **Card** | pattern | `styles/components/ds-card.css` | `elevated`, `flat` | n/a | Semantic section/article where appropriate | S2 | **done** |
| **Section** | pattern | `styles/components/ds-section.css` | default | n/a | `fieldset` + legend + inset body (C5 grouping) | S3 | **done** |
| **PageHeader** | pattern | `styles/components/ds-page-header.css` | default | n/a | One `h1` per page; optional actions slot | S2–S4 | planned |
| **EmptyState** | pattern | `.tp-player-empty-state` in `Player.tsx` | default | n/a | Heading + body + optional CTA link | S1 | **done** |
| **LoadingState** | pattern | `.tp-player-loading` in `Player.tsx` | inline, block | n/a | `aria-busy="true"` | S1 | **done** |
| **ErrorAlert** | pattern | `.tp-error` (tokenized) | `error`, `warning` | n/a | `role="alert"` | S1 | **done** |
| **StatusBanner** | pattern | `ds-alert` in Settings + `.tp-sw-update` | info, success, error | n/a | `role="status"` / `alert` | S3 | **done** (settings) |

---

## Domain composites (handoff + player)

| Component | Tier | Path (planned) | Variants | Storybook | a11y notes | Milestone | Status |
|-----------|------|----------------|----------|-----------|------------|-----------|--------|
| **QrFrame** | compound | `components/ds/QrFrame.tsx` | single, multi | n/a | `alt` from i18n; scan hint text | S4 | **done** |
| **HandoffStepIndicator** | compound | `components/ds/HandoffStepIndicator.tsx` | text `N of M` | n/a | `aria-live="polite"` on progress change | S4 | **done** |
| **HandoffResultCard** | compound | `components/ds/HandoffResultCard.tsx` | qr, lan, relay | n/a | OTP large text; copy actions | S4 | **done** |
| **OtpDisplay** | compound | `components/ds/OtpDisplay.tsx` | 6-digit | n/a | Readable font; not color-only | S4 | **done** |
| **HelpPanel** | compound | `prompter/Help.tsx` | popover, sheet (mobile) | n/a | Escape dismiss; focus management | S1 | **done** |

---

## Reuse (no catalog entry required — style only)

| Component | Location | Action |
|-----------|----------|--------|
| **SanitizedHtml** | `markdown/SanitizedHtml.tsx` | Keep; tokenize preview/player typography |
| **i18n** | `lib/i18n/en.ts` | Extend keys for ds copy |
| **Storage** | `prompter/storage.ts` | No UI |

---

## Variant API reference

### Button (`ds-button`)

```html
<button class="ds-button" data-variant="primary" data-size="md">Play</button>
```

| Prop / attr | Values | Default |
|-------------|--------|---------|
| `data-variant` | `primary`, `secondary`, `ghost` | `secondary` |
| `data-size` | `sm`, `md`, `lg` | `md` |
| `disabled` | boolean | — |

### RangeSlider (`ds-range`)

Wrap native range: `.ds-range` > label + input + `.ds-range__value`.

### Toggle (`ds-toggle`)

Settings row: label (+ optional description) left; switch track right.

```html
<label class="ds-toggle" for="id">
  <span class="ds-toggle__text"><span class="ds-toggle__label">Label</span></span>
  <span class="ds-toggle__control">
    <input id="id" type="checkbox" role="switch" />
    <span class="ds-toggle__track" aria-hidden="true"><span class="ds-toggle__thumb"></span></span>
  </span>
</label>
```

| Prop / attr | Values | Default |
|-------------|--------|---------|
| `data-size` / `size` | `default`, `compact` | `default` |
| `checked` | boolean | — |

**Example id:** `mobile-controls/C5` · **Behavior source:** native checkbox (no OSS)

### AppShell

| Breakpoint | Nav placement |
|------------|---------------|
| `<768px` | Bottom `.ds-mobile-nav` |
| `≥768px` | Top `.tp-header` / `.tp-nav` (tokenized) |

---

## Implementation order (matches screen milestones)

| Order | Components | Unblocks |
|-------|------------|----------|
| 1 | Button, IconButton, RangeSlider, Select, ErrorAlert, AppShell, MobileNav, PlayerToolbar, EmptyState, LoadingState, HelpPanel | S1 `player` |
| 2 | Card, PageHeader, Textarea, SegmentedControl | S2 `home-editor` |
| 3 | Checkbox, Toggle, StatusBanner | S3 `settings` |
| 4 | QrFrame, CopyButton, HandoffStepIndicator, HandoffResultCard, OtpDisplay | S4 `handoff-hub` |

---

## Deprecated

| Component | Reason | Migration |
|-----------|--------|-----------|
| — | (none) | |

---

## Next actions

1. `@ui-component-build start` — wire **Toggle** into `Settings.tsx` (mirror + speech sync); deprecate checkbox rows per [Toggle.md](./Toggle.md).
2. `@ui-visual-verify milestone` + `@ui-accessibility-audit` after settings migration.
