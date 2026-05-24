# Accessibility audit — S2 milestone

**Date:** 2026-05-23  
**Mode:** `@ui-accessibility-audit milestone`  
**Target:** S2 — `home-editor` (`.work.ui/screens/home-editor/20260523-SCREEN-SPEC.md` §9)  
**WCAG target:** 2.1 AA  
**Verdict:** **pass**

---

## Tooling

| Tool | Result |
|------|--------|
| Token contrast math | `tests/a11y/contrast.test.ts` — S2 editor pairs 1/1 pass (83 vitest total) |
| axe-core 4.10 (local fixture) + Playwright | `s2-home-editor-a11y.spec.ts` — 3/3 pass |
| Structural / touch smoke | Labels, radiogroup, `aria-describedby`, 44px targets — pass |

**Run:**

```bash
cd frontend
npm test -- tests/a11y/contrast.test.ts
PLAYWRIGHT_BASE_URL=http://127.0.0.1:9173 ./node_modules/.bin/playwright test --config=playwright.s2-visual.config.ts --grep @s2-a11y
```

---

## Home-editor SPEC §9 checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Visible `<label>` + `aria-describedby` on textarea | pass | `#tp-editor-hint` |
| Errors `role="alert"` | pass | `HomePage` unchanged |
| Format radiogroup | pass | `role="radiogroup"` + option labels |
| Preview `aria-labelledby` | pass | `#tp-preview-title` |
| Upload not sole input method | pass | Textarea + button |
| Touch ≥44px (mobile) | pass | e2e bounding box checks |
| Preview contrast (light) | pass | token pairs + axe |

---

## Findings

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| — | — | No critical or serious axe violations on `/` | — |

---

## Residual gaps (non-blocking)

| Gap | Severity | Notes |
|-----|----------|-------|
| Settings route not re-scanned | low | S3 scope |
| `eslint-plugin-jsx-a11y` not in pipeline | low | Same as S1 |
| axe fixture vs CDN inconsistency | low | S2 uses `tests/fixtures/axe.min.js` (CSP-safe); consider aligning S1 |

---

## UIS registry

| UIS | Status |
|-----|--------|
| UIS-02 | pass — touch targets |
| UIS-03 | pass — drop-zone transition respects reduced motion in CSS |
| UIS-04 | pass — contrast tests |
| UIS-05 | pass — labels, radiogroup, alerts |

---

## Sign-off

S2 accessibility milestone: **pass**. Pair with [VISUAL_VERIFY_S2.md](./VISUAL_VERIFY_S2.md) for `@ui-component-build complete`.
