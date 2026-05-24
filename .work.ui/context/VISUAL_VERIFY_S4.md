# Visual verify — S4 milestone

**Date:** 2026-05-23  
**Mode:** `@ui-visual-verify milestone`  
**Milestone:** S4 (`handoff-hub`, `handoff-receive`, `handoff-multi`)  
**Verdict:** **pass**

---

## Checks

| # | Check | Result | Evidence |
|---|--------|--------|----------|
| 1 | UI visual / structural e2e | **pass** | `s4-handoff-visual.spec.ts` — 6/6 vs `http://127.0.0.1:9173` |
| 2 | UI a11y e2e (paired) | **pass** | `s4-handoff-a11y.spec.ts` — 4/4 (see ACCESSIBILITY_AUDIT_S4.md) |
| 3 | Production UI build | **pass** | Dev stack HMR; preview used by Playwright when no BASE_URL |
| 4 | Token / elevation changes | **pass** | Borderless cards/buttons; `--elevation-*` tokens |
| 5 | Storybook | **n/a** | v1 deferred |
| 6 | Handoff domain E2E regression | **pass** | `bin/e2e-handoff.sh` — 15/15 (includes S4 specs) |

---

## Baseline comparison

| Reference | Route | Assessment |
|-----------|-------|------------|
| `tmp/image copy 2.png` (SPEC §13) | `/handoff/create` | **Improved:** elevated cards, QrFrame, copy link, origin chip, `ds-button` CTAs |
| `tmp/playwright-results/s4-handoff-empty-desktop.png` | empty script | Card + editor CTA |
| `tmp/playwright-results/s4-handoff-qr-result.png` | single-QR result | QrFrame + Copy link |
| `tmp/playwright-results/s4-handoff-multi-desktop.png` | multi-QR mode | Embedded multi UI, primary generate |
| `tmp/playwright-results/s4-handoff-mobile.png` | mobile create | Touch-height primary CTA |
| `tmp/playwright-results/s4-handoff-receive-error.png` | `/handoff/receive` | `ds-alert` error in card |

### S4 deltas (before → after)

- Raw URL wall → **truncated link + Copy button**
- Unstyled meta/buttons → **`ds-card`**, **`ds-button`**, origin **chip**
- Duplicate multi-QR `h1` → **embedded** subheading under hub title
- Native errors → **`ds-alert`** on loopback/API/receive paths
- Player (cross-cutting): **single lever dock** with tabs + large slider

---

## Craft compliance

- **SPECs checked:** `handoff-hub/20260523-SCREEN-SPEC.md` (Approved)
- **§13 exampleIds:** ok — mobile/M1, mobile-controls/C1, dashboards/D1 cited
- **extractedRules:** ok — centered QR, progress N of M, copy affordance, elevated results
- **Native control violations:** none on primary handoff CTAs
- **UIS-07:** pass with notes — elevation stack shipped; LAN/claim polish deferred to S5

---

## Artifacts

| File | Purpose |
|------|---------|
| `frontend/tests/e2e/s4-handoff-visual.spec.ts` | S4 visual smoke + screenshots |
| `frontend/playwright.s4-visual.config.ts` | Dev URL or preview webServer |

**Run:**

```bash
cd frontend
PLAYWRIGHT_BASE_URL=http://127.0.0.1:9173 npx playwright test --config=playwright.s4-visual.config.ts
```

---

## Gaps / waivers

| Gap | Severity | Notes |
|-----|----------|-------|
| Relay/LAN result screenshots | low | Covered by domain E2E; visual spec uses QR + multi-QR |
| Pixel diff baseline | low | Manual screenshot compare only (no Percy) |
