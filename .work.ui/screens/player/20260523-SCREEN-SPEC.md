# Player — Screen SPEC

**Status:** Draft  
**Slug:** `player`  
**Route:** `/play`  
**UI milestone:** S1 (highest visual priority)  
**Path:** `.work.ui/screens/player/20260523-SCREEN-SPEC.md`  
**Components:** `PlayPage`, `Player`, `PlayerControls`, `Help` (`frontend/src/routes/PlayPage.tsx`, `prompter/Player.tsx`, `prompter/PlayerControls.tsx`, `prompter/Help.tsx`)

---

## 1. Summary

The **player** is the teleprompter **performance surface**: fullscreen-capable auto-scroll of the sanitized script with speed, font size, side/bottom clearance, theme, and mirror controls. Users arrive from nav **Player**, after handoff claim, or from editor once a script exists. On mobile this screen should feel like a **native prompter app** — immersive viewport, touch-friendly controls, minimal chrome; on desktop, compact toolbar above the scroll region (controls move below viewport in fullscreen only).

---

## 2. Personas & jobs

| Persona | Job |
|---------|-----|
| **Presenter (phone/tablet)** | Read script while recording; adjust speed live; fullscreen; optional mirror for glass teleprompter |
| **Presenter (desktop)** | Rehearse at desk; keyboard shortcuts; fine-tune font and padding |
| **Returning user** | Resume last script + settings from `tp:settings` and script keys |

---

## 3. States

| State | Behaviour | Visual |
|-------|-----------|--------|
| **loading** | Hydrating script, format, settings | `aria-busy="true"` — `en.play.loading`; prefer subtle skeleton over bare text |
| **empty** | No script in storage | `en.play.empty`; controls **disabled**; link hint to editor (upgrade: secondary CTA) |
| **ready — paused** | Script loaded, not scrolling | Viewport shows script; Play enabled; scroll position top or preserved |
| **ready — playing** | Auto-scroll active | Play shows Pause (`aria-pressed="true"`); wake lock when supported (R5) |
| **fullscreen** | Full viewport player | Shell header hidden on mobile landscape; toolbar **below** viewport (existing CSS order) |
| **help open** | Keyboard shortcuts panel | Popover/sheet; focus trap; Escape closes (UIS-05) |
| **theme light / dark** | `settings.theme` | `.tp-player--dark` or light variant; map to semantic tokens in upgrade |

**Out of scope:** script editing, handoff creation (other screens).

---

## 4. Layout & hierarchy

### Regions (UIS-01)

| Region | Normal mode | Fullscreen |
|--------|-------------|------------|
| App shell | `Layout` header + nav (S1 shell upgrade) | Hidden on mobile landscape |
| Page title | `h1.tp-play-page__title` — SR on mobile (`max-width: 767px`) | SR only |
| **Viewport** | `.tp-player-viewport` — scrollable script | Flex-grow; edge-to-edge |
| **Toolbar** | `.tp-player-footer` — **above** viewport (`order: -1`) | **Below** viewport (`order: 1`) |
| Scroll tail | `.tp-player-scroll-tail` — height from `bottomPadding` % | Same |

### Control toolbar (upgrade targets vs `tmp/image copy.png`)

| Control | Domain | Visual upgrade |
|---------|--------|----------------|
| Play / Pause | R3 | Primary button (`--color-accent`); min 44px touch height on mobile |
| Speed | R3 | Custom range or tokenized slider; label + value (`0.7×` style) |
| Font | R3 | Same pattern; 14–48px |
| Sides | settings | Side padding vw 0–30 |
| Bottom | settings | Bottom clearance % 0–100 (scroll tail) |
| Theme | R3 | Segmented light/dark or select styled with tokens |
| Mirror | R4 | Toggle with clear label |
| Fullscreen | R4 | Icon + text or icon-only with `aria-label` |
| Help | R12 | Opens panel; not keyboard-trapping without escape |

### Breakpoints

| Viewport | Layout |
|----------|--------|
| **&lt;768px portrait** | Compact header; player fills column; smaller toolbar gaps; page title SR-only |
| **&lt;768px landscape** | Hide app header; maximize viewport (`min-height: 100dvh`) |
| **≥768px** | Standard shell; toolbar may wrap; wider range sliders |

### Primary action per viewport

- **Playing:** Pause (or tap gesture future — out of scope v1).
- **Paused:** Play.
- Secondary: fullscreen, help, sliders.

### Visual direction (S1)

- **Immersive viewport:** subtle border/radius on desktop; near full-bleed on mobile; dark theme default-friendly for stage.
- **Toolbar:** elevated surface (`--color-bg-elevated`), `--shadow-sm`, grouped controls with consistent gaps (`--space-2` / `--space-3`).
- **No raw browser-default** range/select chrome where avoidable — use `accent-color: var(--color-accent)` minimum; prefer styled sliders in `@ui-component-build`.
- Migrate `.tp-player` local variables to reference global tokens (`--color-bg-player`, etc.).

---

## 5. Content

| Key / element | Source | Notes |
|---------------|--------|-------|
| Page title | `en.play.title` | Visible desktop; SR mobile |
| Loading | `en.play.loading` | |
| Empty | `en.play.empty` | Add optional `en.play.emptyCta` → link to `/` in upgrade |
| Play / Pause | `en.play.play`, `en.play.pause` | |
| Fullscreen | `en.play.fullscreen`, `en.play.exitFullscreen` | |
| Help | `en.play.helpToggle`, `en.play.helpTitle`, shortcut lines | |
| Control labels | `en.playerControls.*` | Speed, Font, Sides, Bottom, Theme, Mirror |
| Theme options | `en.settings.themeLight`, `themeDark` | |

---

## 6. Interactions

| Interaction | Behaviour |
|-------------|-----------|
| Play / Pause | Toggle `isPlaying`; drives `useScroll` |
| Speed slider | 0.5–3.0 step 0.1; persists via `saveSettings` |
| Font / side / bottom sliders | Update settings + inline styles on `.tp-player-content` |
| Theme select | `light` \| `dark` → class `tp-player--dark` |
| Mirror checkbox | `tp-player--mirror` → `scaleX(-1)` on content |
| Fullscreen | `useFullscreen` on player section ref |
| Help toggle | Panel above/below button per fullscreen state |
| **Keyboard** (desktop, R12) | Space play/pause; `+`/`-` speed; `f` fullscreen — when script loaded |
| Auto-scroll | `useScroll` on viewport ref; respects reduced motion (UIS-03) |

### Focus order (windowed mode)

Play → speed → font → sides → bottom → theme → mirror → fullscreen → help → (help panel if open).

### Touch

All toolbar controls ≥ **44×44px** hit area on viewports &lt;768px (UIS-02).

---

## 7. Data dependencies

| Dependency | Link | Use on this screen |
|------------|------|-------------------|
| Prompter UI R3–R5, R6–R7, R12 | `.work/features/prompter-ui/20260520-SPEC.md` | Player behaviour |
| Markdown render | `.work/features/markdown-render/20260520-SPEC.md` | `renderScript` + `SanitizedHtml` |
| Storage | `prompter/storage.ts` | `tp:script:source`, `tp:script:format`, `tp:settings` JSON |
| Layout math | `prompter/playerLayout.ts` | `computeScrollTailPx` |
| Hooks | `useScroll`, `useWakeLock`, `useFullscreen`, `useKeyboard`, `useViewportHeight` | Do not break contracts in UI-only pass |

**No API calls** on this screen.

---

## 8. Tokens & components

| Token / component | Notes |
|-------------------|--------|
| `--color-bg-player`, `--color-text-primary`, `--color-accent`, etc. | `foundation/20260523-02-design-tokens.md` |
| `.tp-player`, `.tp-player--dark`, `.tp-player-viewport`, toolbar classes | Refactor `prompter.css` to tokens |
| `PlayerControls` | Primary S1 implementation target |
| `SanitizedHtml` | Reuse — script rendering unchanged |
| Button primary/secondary | From `@ui-design-system init` when available |

**Co-implement in S1:** `Layout` / app shell (nav) — same milestone per screen map.

---

## 9. Accessibility

**Target:** WCAG **2.1 AA** (verify with `@ui-accessibility-audit`).

- Player section: `aria-label="Teleprompter player"`.
- Toolbar: `role="toolbar"` + `aria-label="Player settings"`.
- Play: `aria-pressed` reflects playing state.
- Range inputs: `aria-label` + `aria-valuemin/max/now` (existing).
- Empty state: clear message; disabled controls not focus-trapped incorrectly.
- Help panel: keyboard dismiss; focus management (UIS-05).
- Contrast: script on viewport background ≥ 4.5:1 in light and dark themes (UIS-04).
- `prefers-reduced-motion`: reduce or disable non-essential scroll animation (UIS-03).

---

## 10. Analytics

Optional (no script content):

| Event | When |
|-------|------|
| `player.started` | Play pressed |
| `player.paused` | Pause pressed |
| `player.fullscreen` | Enter/exit fullscreen |
| `player.theme.changed` | Theme toggle |

---

## 11. Acceptance criteria

- [ ] **R3** Play/pause auto-scroll; speed 0.5×–3×; font size 14–48; light/dark theme.
- [ ] **R4** Fullscreen and mirror work; mirror flips content horizontally only.
- [ ] **R5** Wake lock during play when browser supports (no UI regression if unsupported).
- [ ] **R6/R7** Script via `SanitizedHtml` only.
- [ ] **R12** Keyboard shortcuts match help text on desktop.
- [ ] Empty script: controls disabled; empty message shown.
- [ ] Settings changes persist to `tp:settings` without breaking storage keys.
- [ ] Side/bottom padding affect horizontal padding and scroll tail height (existing tests).
- [ ] Mobile portrait: SR page title; toolbar usable at 44px targets.
- [ ] Mobile landscape: header hidden; player uses full height.
- [ ] Fullscreen: controls below viewport.
- [ ] S1 visual: toolbar and viewport use semantic tokens; no new raw hex in changed rules.
- [ ] Regression: existing `player` vitest + e2e offline still pass in container.

---

## 12. Concept / UIS registry

| UIS | Applies | Reason | Status |
|-----|---------|--------|--------|
| UIS-01 | yes | Hero viewport; toolbar hierarchy; fullscreen layout | done (S1 visual verify) |
| UIS-02 | yes | Mobile-first; landscape; touch targets | done (S1 visual verify) |
| UIS-03 | yes | Scroll motion; reduced motion | done (S1) |
| UIS-04 | yes | Player light/dark contrast | done (S1 a11y audit) |
| UIS-05 | yes | Toolbar, help panel, keyboard | done (S1) |
| UIS-06 | yes | Agent S1 implementation | waived — no concept-run artifact |

---

## 13. Visual references

| Reference | Path | Notes |
|-----------|------|-------|
| Before (baseline) | `tmp/image copy.png` | Default range inputs; light toolbar; basic borders |
| Foundation | `20260523-01-ui-vision-and-principles.md` | Player-first, mobile-app |
| Patterns | `.ai.ui/standards/20260523-UI-PATTERNS.md` § mobile-native | Editor vs browse toolbars |
| Examples | `.ai.ui/examples/mobile/manifest.md` | |

---

## Implementation notes (S1)

- **Files:** `prompter.css` (player + shell sections), `PlayerControls.tsx`, optional `Layout.tsx`, `index.css` body background.
- **Do not** change scroll algorithm, storage keys, or markdown pipeline without domain SPEC amendment.
- **Player theme:** converge `.tp-player--dark` with global `--color-*` tokens; optional later sync with `data-theme` on `<html>` from Settings (S3).
- **Tests:** run `npm test` in frontend container after CSS/TSX changes.
