# Toggle

**Tier:** primitive · **CSS:** `frontend/src/styles/components/ds-toggle.css`  
**React (optional):** `frontend/src/components/ds/Toggle.tsx`  
**Catalog:** [CATALOG.md](./CATALOG.md) · **Example:** `mobile-controls/C5` (label left, control right)

## Usage

### CSS (vanilla)

```html
<label class="ds-toggle" for="mirror-toggle">
  <span class="ds-toggle__text">
    <span class="ds-toggle__label">Mirror text</span>
  </span>
  <span class="ds-toggle__control">
    <input id="mirror-toggle" type="checkbox" role="switch" />
    <span class="ds-toggle__track" aria-hidden="true">
      <span class="ds-toggle__thumb"></span>
    </span>
  </span>
</label>
```

### React

```tsx
import { Toggle } from "../components/ds/Toggle";

<Toggle
  label="Mirror text"
  checked={mirror}
  onChange={(e) => setMirror(e.target.checked)}
/>
```

## Variant API

| Attribute / prop | Values | Default |
|------------------|--------|---------|
| `data-size` / `size` | `default`, `compact` | `default` |
| `disabled` | boolean | — |
| `checked` / `defaultChecked` | boolean | — |

## Layout

| Pattern | Rule |
|---------|------|
| Settings row | Full-width `.ds-toggle`; label + optional description left; switch right |
| Touch | Row `min-height` ≥ `--size-touch-min` (44px) on `default` size |

## Accessibility

- Native `input[type="checkbox"]` with `role="switch"`.
- Visible label via `htmlFor` / wrapping `<label>`.
- Focus ring on track when input has `:focus-visible`.
- `disabled` reduces opacity; input not interactive.
- Controlled: pass `checked` (sets `aria-checked`).

## Behavior source

Native checkbox (no OSS dependency). Style via project tokens only.

## Storybook

n/a v1 — variants documented here; wire consumers via `@ui-component-build` (e.g. Settings mirror/sync rows).

## Consumers

| Location | Pattern |
|----------|---------|
| `Settings.tsx` | `Toggle` default — mirror + speech sync |
| `PlayerControls.tsx` | `Toggle` `size="compact"` — mirror in toolbar |
