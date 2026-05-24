# Visual verify — S3 milestone

**Date:** 2026-05-23  
**Mode:** `@ui-visual-verify milestone`  
**Milestone:** S3 (`settings`)  
**Verdict:** **pass with gaps**

---

## Checks

| # | Check | Result | Evidence |
|---|--------|--------|----------|
| 1 | UI visual / structural e2e | **pass** | `s3-settings-visual.spec.ts` — 3/3 vs `http://127.0.0.1:9173` |
| 2 | Production UI build | **pass** | `npm run build` in frontend container |
| 3 | Token changes reviewed | **pass** | `dark.css` accent + active nav; settings use `ds-*` only |
| 4 | Storybook | **n/a** | v1 deferred |
| 5 | UIS registry (visual) | **pass** | UIS-01 hierarchy; UIS-02 mobile save width |

---

## Baseline comparison

| Reference | Route | Assessment |
|-----------|-------|------------|
| User capture (native controls) | `/settings` | **Materially improved:** card form, custom sliders, segmented theme, primary Save |
| `tmp/playwright-results/s3-settings-desktop-light.png` | `/settings` | Captured 2026-05-23 |
| `tmp/playwright-results/s3-settings-mobile-light.png` | `/settings` mobile | Full-width primary Save |
| `tmp/playwright-results/s3-settings-desktop-dark.png` | `/settings` dark | `data-theme="dark"` on `<html>` after save |

### Settings deltas (before → after)

- Sliders: browser default → **`ds-range`** with label + value readout
- Theme: `<select>` → **`ds-segmented`** Light/Dark
- Mirror: plain checkbox → **`ds-checkbox`** row
- Save: gray native button → **`ds-button`** primary
- Shell: flat page → **`ds-card`** form on canvas
- App theme: player-only dark → **`data-theme`** on document when saved

---

## Craft compliance

- **SPECs checked:** `settings/20260523-SCREEN-SPEC.md` (Approved)
- **§13 exampleIds:** ok — `mobile-controls/C5`
- **extractedRules:** ok — slider+readout, grouped rhythm, primary Save
- **Native control violations:** none on primary flows
- **UIS-07:** done — ship_with_notes

---

## Fixes during verify

| Issue | Fix |
|-------|-----|
| Dark segmented + Save contrast 3.67:1 | `dark.css` accent `#1d4ed8` (aligned with player-dark) |
| Dark active nav contrast 3.09:1 | `[data-theme="dark"]` active nav uses solid accent + contrast text |

---

## Artifacts

| File | Purpose |
|------|---------|
| `frontend/tests/e2e/s3-settings-visual.spec.ts` | S3 visual smoke + screenshots |
| `frontend/playwright.s3-visual.config.ts` | Dev URL or preview webServer |

**Run:**

```bash
cd frontend
PLAYWRIGHT_BASE_URL=http://127.0.0.1:9173 ./node_modules/.bin/playwright test --config=playwright.s3-visual.config.ts
```

---

## Gaps / waivers

| Gap | Severity | Notes |
|-----|----------|-------|
| No pixel-diff baseline vs user screenshot | low | Optional CI `toHaveScreenshot` |
| Handoff routes still pre-S4 styling | medium | Expected — S4 scope |
| UIS-06 concept artifact not filed | low | Waivable at complete |

---

## Sign-off

S3 **settings** visual milestone: **pass with gaps**. Pair with [ACCESSIBILITY_AUDIT_S3.md](./ACCESSIBILITY_AUDIT_S3.md).
