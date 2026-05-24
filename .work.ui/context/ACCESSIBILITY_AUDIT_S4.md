# Accessibility audit — S4 milestone

**Date:** 2026-05-23  
**Mode:** `@ui-accessibility-audit milestone`  
**Milestone:** S4 (handoff send + receive/multi)  
**Verdict:** **pass**

---

## Scope

| Screen / route | Component | SPEC |
|----------------|-----------|------|
| `/handoff/create` | `HandoffCreate`, `MultiQrCreate` | handoff-hub |
| `/handoff/receive` | `QrConsume` | screen-map receive |
| `/handoff/multi` | `MultiQrConsume` | screen-map multi |

---

## Automated checks

| Check | Result | Evidence |
|-------|--------|----------|
| Playwright structural a11y | **pass** | `s4-handoff-a11y.spec.ts` — 4/4 |
| axe wcag2aa + wcag21aa on `/handoff/create` | **pass** | 0 critical/serious |
| QR receive error `role="alert"` | **pass** | `ds-alert[data-variant=error]` |
| Multi-QR prev/next touch height ≥44px | **pass** | mobile viewport test |
| Vitest contrast suite | **pass** | 87/87 FE tests include `tests/a11y/contrast.test.ts` |

---

## Manual checklist (handoff-hub SPEC §9)

| Criterion | Status |
|-----------|--------|
| QR `alt` meaningful | **pass** — `qrImageAlt` / multi index alt |
| OTP visible, not color-only | **pass** — `OtpDisplay` tabular digits |
| Errors `role="alert"` | **pass** |
| Loopback warning alert | **pass** — `ds-alert` error |
| Disabled when no script / blocked origin | **pass** |
| Copy link status `aria-live` | **pass** — CopyButton `role="status"` |
| Focus order title → meta → CTA → results | **pass** (spot-check) |

---

## Findings

| ID | Severity | Finding | Action |
|----|----------|---------|--------|
| — | — | None blocking | — |

---

## Gaps / follow-ups

| Item | Notes |
|------|-------|
| `/handoff/lan`, `/handoff/claim` | Styled in S5 — audit repeated at S5 complete |
| UIS-06 agent record | Waived in HANDOFF_UI (optional) |

**Run:**

```bash
cd frontend
PLAYWRIGHT_BASE_URL=http://127.0.0.1:9173 npx playwright test --config=playwright.s4-visual.config.ts
```
