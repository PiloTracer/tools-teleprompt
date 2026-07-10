# NEXT_UI — UI planning backlog

> **Path:** `<repo-root>/.work.ui/plans/NEXT_UI.md` · **`@ui-component-build`** owns `## Current UI iteration`.

**Updated:** 2026-05-23 (`@ui-component-build complete` S5)

---

## Recommended next

| Priority | Item |
|----------|------|
| **1** | Production deploy — `deploy/README.md` + `.env.prd` (Agent OS `NEXT.md`) |
| **2** | Optional `@ui-concept-run - UIS-06` (S1–S5 record) |
| **3** | Optional shared `handoff-consume` SCREEN-SPEC for receive variants |

---

## Intake queue

> Free-text UI requests captured by `@ui-screen-spec intake - <sentence>`. Format: `- <YYYY-MM-DD> · <class> · "<sentence>" → <next command>`. Classes: local / cross-cutting / brownfield / underspecified.

- (none yet)

---

## Current UI iteration

**Milestone:** — · **Status:** idle · **Started:** —

_Last completed: **S5** (handoff-lan/claim + player toolbar compaction) 2026-05-23._

---

## Completed: S5 (handoff consume + player toolbar) — archived

**Completed:** 2026-05-23  
**Scope:** `handoff-lan`, `handoff-claim`, player 2-line toolbar  
**Reports:** [VISUAL_VERIFY_S5.md](../context/VISUAL_VERIFY_S5.md) · [ACCESSIBILITY_AUDIT_S5.md](../context/ACCESSIBILITY_AUDIT_S5.md)

### Tasks (all done)

| ID | Description | Completed |
|----|-------------|-----------|
| S5-T1 | LanConsume styled states | 2026-05-23 |
| S5-T2 | HandoffClaim relay OTP form | 2026-05-23 |
| S5-T3 | Shared consume loading pattern | 2026-05-23 |
| S5-T4 | Tests + handoff E2E regression | 2026-05-23 |
| S5-T5 | Verify S5 | 2026-05-23 |
| S5-T6 | Player 2-line toolbar; theme → Settings only | 2026-05-23 |

### Acceptance criteria (closed)

- [x] `/handoff/lan/:token` and `/handoff/claim/:token` match app shell + tokenized error/success UX
- [x] Claim form: 6-digit OTP, accessible labels, primary submit `ds-button`
- [x] No API/claim behaviour changes without domain SPEC update
- [x] Handoff E2E suite still green (21/21)
- [x] Player toolbar: 2 rows — Play + tabs + Mirror / Full + slider + Shortcuts

### UIS registry (S5 closed)

| UIS | Status |
|-----|--------|
| UIS-01 … UIS-05 | pass |
| UIS-06 | waived |
| UIS-07 | pass |

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
| **S5** handoff-lan/claim + player toolbar | 2026-05-23 | [VISUAL_VERIFY_S5.md](../context/VISUAL_VERIFY_S5.md) · [ACCESSIBILITY_AUDIT_S5.md](../context/ACCESSIBILITY_AUDIT_S5.md) |

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
