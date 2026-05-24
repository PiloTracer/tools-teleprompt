# NEXT_UI — UI planning backlog

> **Path:** `<repo-root>/.work.ui/plans/NEXT_UI.md` · **`@ui-component-build`** owns `## Current UI iteration`.

**Updated:** 2026-05-23 (`@ui-component-build complete` S4)

---

## Recommended next

| Priority | Item |
|----------|------|
| **1** | `@ui-component-build plan - S5` — LAN + claim consume polish |
| **2** | Optional `@ui-concept-run - UIS-06` (S1–S4 record) |

---

## Current UI iteration

**Milestone:** — · **Status:** idle · **Started:** —

_Last completed: **S4** (handoff) 2026-05-23. **S5** queued below._

---

## Queued UI iteration (S5)

**Milestone:** S5 · **Status:** queued · **Depends on:** S4 complete

**Scope (screen map 04):** `handoff-lan` · `handoff-claim` (lower traffic; reuse S4 consume patterns)

**Target SPEC:** TBD — optional shared `handoff-consume` SCREEN SPEC; until then, screen-map slugs + pairing feature SPECs.

### Tasks (queued)

| ID | Description | Files | Status | Notes |
|----|-------------|-------|--------|-------|
| S5-T1 | **LanConsume** styled states | `pairing/LanConsume.tsx` | queued | screen · Layout, Card, `ds-alert` errors (404/410) |
| S5-T2 | **HandoffClaim** relay OTP form | `pairing/HandoffClaim.tsx` | queued | screen · `ds-button`, OTP input styling, OtpDisplay hint |
| S5-T3 | Shared consume loading pattern | extract if duplicated from S4-T8/T9 | queued | pattern · DRY with S4 receive screens |
| S5-T4 | Tests + handoff E2E regression | `tests/**`, `bin/e2e-handoff.sh` | queued | gate |
| S5-T5 | Verify S5 | `VISUAL_VERIFY_S5.md`, `ACCESSIBILITY_AUDIT_S5.md` | queued | visual + a11y milestones |

### Acceptance criteria (S5)

- [ ] `/handoff/lan/:token` and `/handoff/claim/:token` match app shell + tokenized error/success UX
- [ ] Claim form: 6-digit OTP, accessible labels, primary submit `ds-button`
- [ ] No API/claim behaviour changes without domain SPEC update
- [ ] Handoff E2E suite still green

---

## Done (UI)

| Item | Date | Artifact |
|------|------|----------|
| UI bootstrap | 2026-05-23 | `.work.ui/` |
| UI foundation + tokens | 2026-05-23 | `20260523-01` … `04`, `tokens.css` |
| screen-spec-ready | 2026-05-23 | certified |
| **S1** player + app shell | 2026-05-23 | [VISUAL_VERIFY_S1.md](../context/VISUAL_VERIFY_S1.md) · [ACCESSIBILITY_AUDIT_S1.md](../context/ACCESSIBILITY_AUDIT_S1.md) |
| **S2** home-editor | 2026-05-23 | [VISUAL_VERIFY_S2.md](../context/VISUAL_VERIFY_S2.md) · [ACCESSIBILITY_AUDIT_S2.md](../context/ACCESSIBILITY_AUDIT_S2.md) |
| **S3** settings | 2026-05-23 | [VISUAL_VERIFY_S3.md](../context/VISUAL_VERIFY_S3.md) · [ACCESSIBILITY_AUDIT_S3.md](../context/ACCESSIBILITY_AUDIT_S3.md) |
| **S4** handoff hub + receive/multi | 2026-05-23 | [VISUAL_VERIFY_S4.md](../context/VISUAL_VERIFY_S4.md) · [ACCESSIBILITY_AUDIT_S4.md](../context/ACCESSIBILITY_AUDIT_S4.md) |

---

## Completed: S4 (handoff) — archived

**Completed:** 2026-05-23  
**Target SPEC:** `.work.ui/screens/handoff-hub/20260523-SCREEN-SPEC.md` (Approved → Implemented)

### Tasks (all done)

| ID | Description | Completed |
|----|-------------|-----------|
| S4-T1 … S4-T12 | Primitives, handoff screens, E2E, verify | 2026-05-23 |

### UIS registry (S4 closed)

| UIS | Status |
|-----|--------|
| UIS-01 … UIS-05 | pass |
| UIS-06 | waived |
| UIS-07 | pass |

---

## Completed: S3 (settings) — archived

**Completed:** 2026-05-23  
**Target SPEC:** `.work.ui/screens/settings/20260523-SCREEN-SPEC.md` (Approved → Implemented)

### Tasks (all done)

| ID | Description | Completed |
|----|-------------|-----------|
| S3-T1 … S3-T7 | Catalog controls, theme sync, tests, verify | 2026-05-23 |

### Acceptance criteria (closed)

- [x] All settings fields load/save via `tp:settings`
- [x] `ds-*` primitives on `/settings`
- [x] `data-theme` on `<html>` when saved
- [x] Visual + a11y milestones pass (with documented gaps)
- [x] UI task gate (vitest 87/87 in container, 2026-05-23)

### UIS registry (S3 closed)

| UIS | Status |
|-----|--------|
| UIS-01 … UIS-05 | pass |
| UIS-06 | waived |
| UIS-07 | pass |

---

## Completed: S2 (home-editor) — archived

**Completed:** 2026-05-23  
**Target SPEC:** `.work.ui/screens/home-editor/20260523-SCREEN-SPEC.md` (Approved → Implemented)

### Tasks (all done)

| ID | Description | Completed |
|----|-------------|-----------|
| S2-T1 … S2-T8 | Layout, primitives, verify | 2026-05-23 |

### UIS registry (S2 closed)

| UIS | Status |
|-----|--------|
| UIS-01 … UIS-05 | pass |
| UIS-06 | waived |
| UIS-07 | pass |

---

## Completed: S1 (player + app shell) — archived

**Completed:** 2026-05-23  
**Reports:** [VISUAL_VERIFY_S1.md](../context/VISUAL_VERIFY_S1.md) · [ACCESSIBILITY_AUDIT_S1.md](../context/ACCESSIBILITY_AUDIT_S1.md)
