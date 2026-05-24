# tools-teleprompt — Design tokens

**Doc:** UI foundation **02** · **Created:** 2026-05-23

## Canonical token file (code)

| Item | Path |
|------|------|
| **Tokens (light / default)** | `frontend/src/styles/tokens.css` |
| **Dark theme overrides** | `frontend/src/styles/themes/dark.css` |
| **Import order** | `main.tsx`: tokens → `index.css` → route CSS (`prompter.css` via `Layout`) |

**Stack:** vanilla-css — CSS custom properties on `:root`; theme via `[data-theme="dark"]` on `document.documentElement` (align with Settings “Theme” when wired).

## Semantic token map

### Color

| Token | Light | Dark (`data-theme="dark"`) | Usage |
|-------|-------|----------------------------|--------|
| `--color-bg-canvas` | `#f8f9fa` | `#0d0d0d` | App shell background |
| `--color-bg-surface` | `#ffffff` | `#1a1a1a` | Cards, panels, preview |
| `--color-bg-elevated` | `#ffffff` | `#242424` | Toolbars, modals |
| `--color-bg-player` | `#ffffff` | `#000000` | Player viewport |
| `--color-text-primary` | `#1a1a1a` | `#f0f0f0` | Body, script |
| `--color-text-secondary` | `#555555` | `#a8a8a8` | Hints, metadata |
| `--color-text-muted` | `#777777` | `#888888` | Disabled copy |
| `--color-border-default` | `#d0d0d0` | `#333333` | Dividers, inputs |
| `--color-border-strong` | `#999999` | `#555555` | Focused fields |
| `--color-accent` | `#2563eb` | `#3b82f6` | Primary actions, links |
| `--color-accent-hover` | `#1d4ed8` | `#60a5fa` | Hover |
| `--color-accent-contrast` | `#ffffff` | `#ffffff` | Text on accent |
| `--color-danger` | `#b91c1c` | `#f87171` | Errors (`role="alert"`) |
| `--color-focus-ring` | `#2563eb` | `#60a5fa` | Focus visible |

### Typography

| Token | Value | Usage |
|-------|-------|--------|
| `--font-family-sans` | `system-ui, -apple-system, Segoe UI, Roboto, sans-serif` | UI chrome |
| `--font-family-mono` | `ui-monospace, SFMono-Regular, Menlo, monospace` | Editor |
| `--font-family-script` | `var(--font-family-sans)` | Player script (override in settings) |
| `--font-size-xs` … `--font-size-2xl` | 0.75rem … 1.5rem | Scale |
| `--font-weight-regular` | `400` | Body |
| `--font-weight-semibold` | `600` | Nav active, headings |
| `--font-weight-bold` | `700` | Brand |
| `--line-height-tight` | `1.25` | Headings |
| `--line-height-normal` | `1.5` | UI |
| `--line-height-relaxed` | `1.65` | Player script |

### Space & layout

| Token | Value | Usage |
|-------|-------|--------|
| `--space-1` … `--space-8` | 0.25rem … 2rem | 4px grid |
| `--layout-max-width` | `960px` | Content column (editor/settings) |
| `--layout-player-max-width` | `100%` | Full-bleed player |
| `--safe-area-top/bottom` | `env(safe-area-inset-*)` | PWA notches |

### Radius & elevation

| Token | Value | Usage |
|-------|-------|--------|
| `--radius-sm` | `4px` | Nav pills |
| `--radius-md` | `8px` | Buttons, inputs |
| `--radius-lg` | `12px` | Panels |
| `--shadow-sm` | `0 1px 2px rgb(0 0 0 / 8%)` | Toolbar |
| `--shadow-md` | `0 4px 12px rgb(0 0 0 / 12%)` | Help panel |

### Motion

| Token | Value | Usage |
|-------|-------|--------|
| `--duration-fast` | `120ms` | Hover |
| `--duration-normal` | `200ms` | Panels |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Transitions |

### Z-index

| Token | Value | Usage |
|-------|-------|--------|
| `--z-header` | `100` | App shell |
| `--z-toolbar` | `110` | Player toolbar |
| `--z-overlay` | `200` | Help, SW update banner |
| `--z-modal` | `300` | Future sheets |

## Component class prefix

**Prefix:** `tp-` (existing brownfield BEM in `prompter.css`). New primitives may use `ds-` for shared design-system atoms after `@ui-design-system init`.

## Migration plan (brownfield)

| Phase | Action |
|-------|--------|
| **Now** | `tokens.css` + `themes/dark.css` created; imported from `main.tsx` |
| **S1** | Shell + player: replace hardcoded `#ccc`, `#fafafa`, etc. in player/header |
| **S2+** | Editor, settings, handoff surfaces per screen SPEC |

## Rules

- Components use **semantic tokens** only for new/changed styles.
- Theme switch must update `data-theme` on `<html>` and pass UIS-04 contrast check on player light/dark.
- Player mirror/fullscreen classes (`.tp-player--dark`, `.tp-player--mirror`) remain until refactored to token-driven variants.

## Evidence

| Claim | Tag |
|-------|-----|
| WCAG AA contrast on player text/background | **assumption** until `@ui-accessibility-audit` |
| Token file matches code | **confirmed** — `frontend/src/styles/tokens.css` exists |
