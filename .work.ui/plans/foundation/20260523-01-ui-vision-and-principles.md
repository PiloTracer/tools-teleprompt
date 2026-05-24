# tools-teleprompt — UI vision and principles

**Doc:** UI foundation **01** · **Created:** 2026-05-23 · **Path:** `.work.ui/plans/foundation/`

## Project classification

| Field | Value |
|-------|-------|
| **Archetype** | mobile-app |
| **Complexity** | M |
| **Style stack** | vanilla-css |
| **Primary surfaces** | mobile-first PWA; responsive desktop companion |
| **Brownfield** | `frontend/src` (React 19 + Vite 6) |
| **Baseline captures** | `tmp/image.png`, `tmp/image copy.png`, `tmp/image copy 2.png`, `tmp/image copy 3.png` |

(Source: `@ui-project-approach` · `@ui-style-stack set - vanilla-css` · recorded in `HANDOFF_UI`)

## Product UI intent

Deliver a **major visual upgrade** on a working teleprompter PWA: prompter **editor + player**, **settings**, and **cross-device handoff** (single QR, multi-QR, LAN, relay + OTP). The product must feel **native on phone** (fullscreen player, touch-friendly controls, safe areas) while remaining usable on desktop for script prep and QR display.

**Brownfield constraint:** Behaviour and domain contracts stay in Agent OS feature SPECs (`.work/features/`). This UI program changes presentation, layout, tokens, and interaction patterns — not pairing semantics or storage keys.

## Design principles

1. **Mobile-first, player-first** — The player is the hero surface; editor and handoff optimize for “prepare on desktop, perform on phone.”
2. **One primary action per viewport** — e.g. Play on player, Save on settings, “Next code” on multi-QR; secondary actions in sheets or overflow (UIS-01).
3. **Semantic tokens only** — No new ad-hoc hex in components; migrate `prompter.css` literals to `frontend/src/styles/tokens.css` incrementally.
4. **Calm, high-contrast reading** — Teleprompter text is the product; chrome stays minimal; dark player theme is default-capable for stage use.
5. **Accessible by default** — WCAG **AA** target; 44px touch targets on mobile; keyboard paths preserved for editor/player (UIS-02, UIS-05).
6. **Respect reduced motion** — Scroll animation and transitions honor `prefers-reduced-motion` (UIS-03).

## Density and tone

- **Density:** comfortable on phone (readable line length, generous tap targets); compact toolbar on player when not fullscreen.
- **Craft tier:** **refined** — catalog primitives on primary flows; custom control anatomy per `mobile-controls/C5` (see player SPEC §13).
- **Motion:** minimal for chrome; moderate for scroll/play feedback only when motion is not reduced.
- **Brand voice in UI copy:** clear, instructional, no jargon — extend existing `frontend/src/lib/i18n/en.ts` stubs.

## Out of scope (UI v1 upgrade)

- User accounts, billing, or admin dashboards
- Tailwind / CSS-in-JS / new styling dependencies without owner approval
- Rewriting domain logic (pairing API, markdown sanitize pipeline, storage keys)
- Storybook in v1 (`DOCS_UI_STACK.md`)
- Marketing / landing site shell

## Links

- **Domain scope:** `.work/plans/foundation/20260520-01-tools-teleprompt-initial-scope.md`
- **Domain SPECs:** `.work/features/prompter-ui/`, `pairing-api/`, `markdown-render/`
- **Style stack rules:** `.ai.ui/style-stacks/vanilla-css.md`
- **Patterns:** `.ai.ui/standards/20260523-UI-PATTERNS.md`
- **A11y bar:** `.ai.ui/standards/20260523-ACCESSIBILITY_STANDARD.md` (target AA)
- **Inspiration (non-spec):** `tmp/*.png` (before), `.ai.ui/examples/mobile/manifest.md`
