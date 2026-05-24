# Accessibility audit — S5 milestone

**Date:** 2026-05-23  
**Mode:** `@ui-accessibility-audit milestone`  
**Milestone:** S5 (`handoff-lan`, `handoff-claim`) + player toolbar compaction  
**Verdict:** **pass**

---

## Scope

| Screen / route | Component | SPEC |
|----------------|-----------|------|
| `/handoff/lan/:token` | `LanConsume` | screen-map `handoff-lan` |
| `/handoff/claim/:token` | `HandoffClaim` | screen-map `handoff-claim` |
| `/play` | `PlayerControls` (toolbar refactor) | player S1 |

---

## Automated checks

| Check | Result | Evidence |
|-------|--------|----------|
| S5 Playwright structural a11y | **pass** | `s5-handoff-a11y.spec.ts` — 3/3 |
| axe wcag2aa + wcag21aa on `/handoff/claim/:token` | **pass** | 0 critical/serious |
| LAN error `role="alert"` | **pass** | `ds-alert[data-variant=error]` |
| Claim OTP labeled input | **pass** | `htmlFor` + `one-time-code` autocomplete |
| Vitest contrast suite | **pass** | `tests/a11y/contrast.test.ts` |
| S1 player a11y regression | **pass** | Theme removed from player; mirror + range labels retained |

---

## Manual checklist

| Criterion | Status |
|-----------|--------|
| Claim form labels associated | **pass** |
| OTP input keyboard / numeric mode | **pass** |
| Errors `role="alert"` on LAN/claim | **pass** |
| Player toolbar 2-row focus order | **pass** (spot-check: Play → tabs → mirror → Full → slider → Shortcuts) |
| Theme still available in Settings | **pass** |

---

## Findings

| ID | Severity | Finding | Action |
|----|----------|---------|--------|
| — | — | None blocking | — |

---

## Gaps / follow-ups

| Item | Notes |
|------|-------|
| UIS-06 agent record | Waived in HANDOFF_UI (optional) |
| Dedicated handoff-consume SCREEN-SPEC §9 | Optional; screen-map + pairing SPECs used |

---

## Verdict rationale

All S5 consume routes meet WCAG-oriented structural checks. Player theme removal does not reduce accessibility — theme remains in Settings with radiogroup semantics.
