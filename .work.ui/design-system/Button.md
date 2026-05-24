# Button

**Tier:** primitive · **CSS:** `frontend/src/styles/components/ds-button.css`  
**React (optional):** `frontend/src/components/ds/Button.tsx`  
**Catalog:** [CATALOG.md](./CATALOG.md)

## Usage

### CSS (vanilla)

```html
<button type="button" class="ds-button" data-variant="primary" data-size="md">
  Play
</button>
```

### React

```tsx
import { Button } from "../components/ds/Button";

<Button variant="primary" size="sm" aria-pressed={isPlaying} onClick={onPlayPause}>
  Play
</Button>
```

## Variant API

| Attribute / prop | Values | Default |
|------------------|--------|---------|
| `data-variant` / `variant` | `primary`, `secondary`, `ghost` | `secondary` |
| `data-size` / `size` | `sm`, `md`, `lg` | `md` |
| `disabled` | boolean | — |
| `aria-pressed` | boolean | — (toggle buttons, e.g. Play/Pause) |

## Variants

| Variant | Use |
|---------|-----|
| `primary` | Main action (Play, submit) |
| `secondary` | Secondary CTA (empty state link styled as button) |
| `ghost` | Toolbar icon-adjacent actions (Help) |

## Sizes

| Size | Min height | Notes |
|------|------------|-------|
| `sm` | `--size-touch-min` (44px) | Player toolbar, mobile |
| `md` | `--size-touch-min` | Default |
| `lg` | 3rem | Prominent CTAs (future) |
| `compact` | 2rem | Dense desktop toolbars only |

## Accessibility

- Native `<button type="button">` (or `submit` when in forms).
- Global `:focus-visible` ring from `tokens.css`.
- `disabled` reduces opacity; not removed from tab order incorrectly.
- Toggle actions: set `aria-pressed` to match state (Play/Pause, fullscreen).
- Icon-only: use ghost + required `aria-label` (IconButton pattern in catalog).

## Storybook

n/a v1 — document variants in this file and visual-verify `/play` for primary/ghost usage.

## Consumers (S1)

| Location | Pattern |
|----------|---------|
| `PlayerControls.tsx` | `ds-button` primary Play, secondary fullscreen |
| `Help.tsx` | `ds-button` ghost |
| `Player.tsx` | `Link` + `ds-button` secondary empty CTA |
