# NEXT - planning backlog

**Updated:** 2026-05-21 (session closed — commit push)

---

## Recommended next

**`@code-implementation plan - M5`** — Pairing API and relay handoff (master plan §19 M5).

---

## Current iteration

M4 complete — see **Done — M4 iteration (archived)** below.

---

## Done

| Item | Date |
|------|------|
| Foundation P0–P6 | 2026-05-20 |
| Master plan Approved | 2026-05-21 |
| M1 platform scaffold | 2026-05-21 |
| M1 formal complete | 2026-05-21 |
| M2 markdown render pipeline | 2026-05-21 |
| M2 formal complete | 2026-05-21 |
| Compose approved + committed | 2026-05-21 |
| MOD-06 (M1, M2) | 2026-05-21 |
| M3 prompter UI core | 2026-05-21 |
| M3 formal complete | 2026-05-21 |
| MOD-06 (M3) | 2026-05-21 |
| M4 player + PWA | 2026-05-21 |
| M4 formal complete | 2026-05-21 |
| MOD-06 (M4) | 2026-05-21 |

---

## Done — M4 iteration (archived)

**Milestone ref:** M4 · `.work/plans/full/20260521-full-plan.md` §19  
**Status:** complete  
**Started:** 2026-05-21  
**Completed:** 2026-05-21  
**Target SPEC:** `.work/features/prompter-ui/20260520-SPEC.md`

### Tasks

| ID | Description | Completed | Notes |
|------|-------------|-----------|-------|
| M4-T1 | Auto-scroll player + speed | 2026-05-21 | `useScroll.ts`, `Player.tsx` |
| M4-T2 | Player controls | 2026-05-21 | R3–R4 |
| M4-T3 | Fullscreen + wake lock | 2026-05-21 | R4–R5 |
| M4-T4 | PWA manifest + vite-plugin-pwa | 2026-05-21 | workbox precache |
| M4-T5 | SW update UX | 2026-05-21 | R10 banner |
| M4-T6 | Keyboard shortcuts + help | 2026-05-21 | R12 |
| M4-T7 | Playwright offline e2e | 2026-05-21 | `bin/e2e-offline.sh` |

### Acceptance criteria (verified)

- [x] prompter-ui SPEC **R3–R8, R12** implemented and tested (`player.test.tsx`, e2e offline)
- [x] Player renders markdown via `SanitizedHtml` only (R6)
- [x] Settings from M3 applied in player
- [x] PWA shell + SW registered; offline client-nav prompter works (R8, e2e)
- [x] SW update banner prompts reload (R10, `registerSW.ts`)
- [x] FE `npm test`, `npm run lint`, `npm run typecheck` exit 0 in container
- [x] Offline e2e via `bin/e2e-offline.sh` — 1/1 pass

### Validation (2026-05-21)

- [x] `npm test` — 48/48 pass
- [x] `npm run lint` — exit 0
- [x] `npm run typecheck` — exit 0
- [x] `bin/e2e-offline.sh` — 1/1 pass
- [ ] Manual Lighthouse PWA audit — deferred (W6)

### Concept / NFR registry

| Concept id | Status | Evidence |
|------------|--------|----------|
| MOD-01 | done 2026-05-21 | Player → SanitizedHtml only |
| MOD-04 | done 2026-05-21 | SW ops note in MOD-06 M4 |
| MOD-06 | done 2026-05-21 | `.work/context/20260521-MOD-06-M4.md` |

---

## Done — M3 iteration (archived)

**Milestone ref:** M3 · `.work/plans/full/20260521-full-plan.md` §19  
**Status:** complete  
**Started:** 2026-05-21  
**Completed:** 2026-05-21  
**Target SPEC:** `.work/features/prompter-ui/20260520-SPEC.md`

### Tasks

| ID | Description | Completed | Notes |
|------|-------------|-----------|-------|
| M3-T1 | React Router routes | 2026-05-21 | react-router-dom ^7 |
| M3-T2 | Script editor | 2026-05-21 | SPEC R1 |
| M3-T3 | Format selector + preview | 2026-05-21 | SanitizedHtml only (R6) |
| M3-T4 | localStorage + IndexedDB persistence | 2026-05-21 | SPEC §5 keys |
| M3-T5 | Settings panel | 2026-05-21 | |
| M3-T6 | Max size validation (256 KB) | 2026-05-21 | |
| M3-T7 | Responsive layout shell | 2026-05-21 | |
| M3-T8 | i18n stub (English) | 2026-05-21 | |

### Acceptance criteria (verified)

- [x] prompter-ui SPEC **R1, R2, R7, R11** covered by tests (`prompter.test.tsx`)
- [x] Preview uses `SanitizedHtml` only — no raw `dangerouslySetInnerHTML` outside markdown module
- [x] Storage keys match SPEC §5; reload restores script + format
- [x] Oversize script blocked with UX message (limits.ts)
- [x] Task gate: FE `npm test`, `npm run lint`, `npm run typecheck` exit 0 in container

### Validation (2026-05-21)

- [x] `npm test` — 29/29 pass
- [x] `npm run lint` — exit 0
- [x] `npm run typecheck` — exit 0
- [ ] Manual mobile viewport — deferred to M4 Playwright; mobile-first CSS in place (`assumption`)

### Concept / NFR registry

| Concept id | Status | Evidence |
|------------|--------|----------|
| MOD-01 | done 2026-05-21 | markdown-render via Preview only |
| MOD-06 | done 2026-05-21 | `.work/context/20260521-MOD-06-M3.md` |

---

## Done — M2 iteration (archived)

| Task | Completed | Notes |
|------|-----------|-------|
| M2-T1 … M2-T6 | 2026-05-21 | renderScript + sanitize + SanitizedHtml; 19 FE tests pass |
| MOD-06 | 2026-05-21 | Evidence: `.work/context/20260521-MOD-06-M2.md` |

---

## Done — M1 iteration (archived)

| Task | Completed | Notes |
|------|-----------|-------|
| M1-T1 … M1-T8 | 2026-05-21 | Docker-first gates pass in container |
| MOD-06 | 2026-05-21 | Evidence: `.work/context/20260521-MOD-06-M1.md` |

---

## Blocked on owner

| Item | Notes |
|------|------|
| U1 / U6 / U8 defaults | Plan defaults apply (W2); M3-T6 uses 256 KB (U1) |

---

## Waivers

- W3 cross-model review — M6-T6 (formal)
- W2 U1/U6/U8 — defaults in plan
