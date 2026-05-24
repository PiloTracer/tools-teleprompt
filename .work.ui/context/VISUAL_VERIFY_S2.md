# Visual verify — S2 milestone

**Date:** 2026-05-23  
**Mode:** `@ui-visual-verify milestone`  
**Milestone:** S2 (`home-editor`)  
**Verdict:** **pass with gaps**

---

## Checks

| # | Check | Result | Evidence |
|---|--------|--------|----------|
| 1 | UI visual / structural e2e | **pass** | `s2-home-editor-visual.spec.ts` — 2/2 vs `http://127.0.0.1:9173` |
| 2 | Production UI build | **pass** | `npm run build` in `tools-teleprompt-frontend-dev` — exit 0 (earlier session) |
| 3 | Token changes reviewed | **pass** | Editor/preview use `var(--color-*)`; no new hex in `prompter.css` editor blocks |
| 4 | Storybook | **n/a** | v1 deferred |
| 5 | UIS registry (visual) | **pass** | UIS-01 layout; UIS-02 mobile stack + 44px controls (structural e2e) |

---

## Baseline comparison

| Reference | Route | Assessment |
|-----------|-------|------------|
| `tmp/image.png` (before) | `/` | Cramped columns — **fixed**: equal two-column grid ≥768px |
| `tmp/after_some_changes.png` (pre-S2) | `/` | Broken layout — **fixed**: `minmax(0, 1fr)` + side-by-side boxes |
| `tmp/playwright-results/s2-editor-desktop.png` | `/` | Captured 2026-05-23 — cards, segmented format, ds-button upload |
| `tmp/playwright-results/s2-editor-mobile.png` | `/` mobile | Editor above preview; bottom nav visible |

### Editor deltas (before → after)

- Layout: uneven columns → **two equal columns** on desktop; stacked on mobile
- Editor: raw borders/hex → **`ds-card`** + **`ds-textarea`** tokens
- Format: bare radio labels → **`ds-segmented`** control
- Upload: plain button → catalog **`ds-button`** secondary
- Preview: `#fff` / `#ddd` box → tokenized **inset** preview well

---

## Craft compliance

- **SPECs checked:** `home-editor/20260523-SCREEN-SPEC.md` (Approved)
- **§13 exampleIds:** ok — `mobile-controls/C5`, `mobile/C1`
- **extractedRules:** ok — segmented format, Button upload, card surfaces, responsive grid
- **Native control violations:** none on primary flows (format + upload)
- **UIS-07:** done — see below

### UIS-07 Surface and control craft

- **Craft tier:** refined
- **SPEC §13 exampleIds:** `mobile-controls/C5`, `mobile/C1`
- **Surface stack:** ok — `ds-card` elevated panels; preview inset well
- **Control anatomy:** ok — segmented format; catalog upload; labeled textarea
- **Grouping / clarity:** ok — editor label + hint; preview heading
- **§13 rules reflected:** yes
- **Recommendation:** ship_with_notes (no pixel-diff CI baseline yet)

---

## Artifacts

| File | Purpose |
|------|---------|
| `frontend/tests/e2e/s2-home-editor-visual.spec.ts` | S2 visual smoke + screenshots |
| `frontend/playwright.s2-visual.config.ts` | Dev URL or preview webServer |
| `tmp/playwright-results/s2-editor-*.png` | Milestone captures |

**Run (dev stack on port 9173):**

```bash
cd frontend
PLAYWRIGHT_BASE_URL=http://127.0.0.1:9173 ./node_modules/.bin/playwright test --config=playwright.s2-visual.config.ts
```

---

## Gaps / waivers

| Gap | Severity | Owner action |
|-----|----------|--------------|
| No Playwright `toHaveScreenshot` baseline in CI | low | Optional follow-up |
| `axe.min.js` vendored under `tests/fixtures/` (~540 KB) | low | Pin version in fixtures README; S1 still uses CDN |
| Host `npm run build` may fail if `node_modules/.tmp` owned by root (Docker) | medium | Run build in frontend container or `chown` .tmp |
| UIS-06 concept artifact not filed | low | Run `@ui-concept-run - UIS-06` before `complete` or waive in HANDOFF_UI |

---

## Sign-off

S2 **home-editor** visual milestone: **pass with gaps above**. Proceed to `@ui-accessibility-audit milestone` (paired) then `@ui-component-build complete`.
