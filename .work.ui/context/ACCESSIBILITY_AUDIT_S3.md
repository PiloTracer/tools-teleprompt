# Accessibility audit — S3 milestone

**Date:** 2026-05-23  
**Mode:** `@ui-accessibility-audit milestone`  
**Target:** S3 — `settings` (`.work.ui/screens/settings/20260523-SCREEN-SPEC.md` §9)  
**WCAG target:** 2.1 AA  
**Verdict:** **pass** (after dark-theme contrast fixes)

---

## Tooling

| Tool | Result |
|------|--------|
| Token contrast math | `tests/a11y/contrast.test.ts` — 4/4 pass (incl. S3 dark pairs) |
| axe-core 4.10 (local fixture) + Playwright | `s3-settings-a11y.spec.ts` — 4/4 pass |
| Structural / touch smoke | Sliders, radiogroup, checkbox, Save — pass |

**Run:**

```bash
cd frontend
npm test -- tests/a11y/contrast.test.ts
PLAYWRIGHT_BASE_URL=http://127.0.0.1:9173 ./node_modules/.bin/playwright test --config=playwright.s3-visual.config.ts --grep @s3-a11y
```

---

## Settings SPEC §9 checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Visible labels on all controls | pass | `ds-range__label` + `aria-label` on sliders |
| Theme radiogroup | pass | `role="radiogroup"` |
| Mirror checkbox label | pass | `ds-checkbox` |
| Save focus ring | pass | `ds-button` focus-visible |
| Success `role="status"` | pass | `ds-alert` variant status |
| Touch ≥44px mobile | pass | e2e bounding boxes |
| Light + dark axe on `/settings` | pass | After `dark.css` nav + accent fix |

---

## Findings fixed this audit

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| A11Y-S3-01 | serious | Dark primary/segmented `#3b82f6` + white ~3.67:1 | `dark.css` accent → `#1d4ed8` |
| A11Y-S3-02 | serious | Dark active nav link ~3.09:1 | Solid accent background + contrast text on active nav |

---

## Residual gaps (non-blocking)

| Gap | Severity | Notes |
|-----|----------|-------|
| Handoff routes not axe-scanned | low | S4 |
| `eslint-plugin-jsx-a11y` not in pipeline | low | Same as S1/S2 |
| Error path on save untested in e2e | low | `saveSettings` rarely fails |

---

## UIS registry

| UIS | Status |
|-----|--------|
| UIS-02 | pass |
| UIS-03 | pass |
| UIS-04 | pass |
| UIS-05 | pass |

---

## Sign-off

S3 accessibility milestone: **pass**. Ready for `@ui-component-build complete` with [VISUAL_VERIFY_S3.md](./VISUAL_VERIFY_S3.md).
