# Accessibility audit — S1 milestone

**Date:** 2026-05-23  
**Mode:** `@ui-accessibility-audit milestone`  
**Target:** S1 — `player` + app shell (`.work.ui/screens/player/20260523-SCREEN-SPEC.md` §9)  
**WCAG target:** 2.1 AA  
**Verdict:** **pass** (after contrast fixes)

---

## Tooling

| Tool | Result |
|------|--------|
| Token contrast math | `frontend/tests/a11y/contrast.test.ts` — 2/2 pass |
| axe-core 4.10 (CDN) + Playwright | `frontend/tests/e2e/s1-player-a11y.spec.ts` — 3/3 pass |
| Structural / keyboard smoke | Roles, labels, skip link focus — pass |
| eslint jsx-a11y | not configured (gap — low) |

**Run:**

```bash
cd frontend
npm test -- tests/a11y/contrast.test.ts
PLAYWRIGHT_BASE_URL=http://127.0.0.1:9173 npx playwright test --config=playwright.s1-visual.config.ts --grep @s1-a11y
```

---

## Player SPEC §9 checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| `aria-label` on player section | pass | `Teleprompter player` |
| Toolbar `role="toolbar"` + label | pass | `Player settings` |
| Play `aria-pressed` | pass | Toggles with state |
| Range `aria-*` | pass | min/max/now + labels |
| Empty state | pass | Message + disabled controls |
| Help Escape + focus | pass | Implemented in `Help.tsx` |
| Viewport/script contrast light & dark | pass | Token pairs + axe after fix |
| `prefers-reduced-motion` | pass | Auto-scroll paused; skeleton static |

---

## Shell (S1 co-scope)

| Requirement | Status |
|-------------|--------|
| Skip link to `#main-content` | pass |
| Nav `aria-label` | pass (desktop + mobile) |
| `:focus-visible` ring | pass (`tokens.css`) |
| Touch targets ≥44px (mobile) | pass (`--size-touch-min`) |

---

## Findings fixed this audit

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| A11Y-S1-01 | serious | Active nav `#2563eb` on tint ~4.36:1 | Active link uses `--color-accent-hover` + stronger tint |
| A11Y-S1-02 | serious | Dark player primary `#3b82f6` + white ~3.67:1 at `sm` | `player-dark.css` accent → `#1d4ed8` |
| A11Y-S1-03 | serious | Dark segmented selected label same as A11Y-S1-02 | Resolved by player-dark accent |

---

## Residual gaps (non-blocking)

| Gap | Severity | Notes |
|-----|----------|-------|
| Settings / editor routes not axe-scanned | low | S2/S3 scope |
| `eslint-plugin-jsx-a11y` not in pipeline | low | Recommend add in S2 |
| axe via CDN (not pinned npm dep) | low | Acceptable for milestone; pin in CI later |
| Document `data-theme` vs `.tp-player--dark` | low | S3 convergence |

---

## UIS registry

| UIS | Status |
|-----|--------|
| UIS-03 | pass — reduced motion |
| UIS-04 | pass — contrast verified |
| UIS-05 | pass — toolbar, help, keyboard |

---

## Sign-off

S1 accessibility milestone: **pass**. Safe to proceed with `@ui-component-build complete` after owner visual sign-off.
