# NEXT - planning backlog

**Updated:** 2026-05-21 (session closed — commit push)

---

## Recommended next

**`@code-implementation plan - M6`** — QR handoff, E2E, and production hardening (master plan §19 M6).

---

## Current iteration

M5 complete — see **Done — M5 iteration (archived)** below.

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
| M5 pairing API + relay handoff | 2026-05-21 |
| M5 formal complete | 2026-05-21 |
| MOD-06 (M5) | 2026-05-21 |

---

## Done — M5 iteration (archived)

**Milestone ref:** M5 · `.work/plans/full/20260521-full-plan.md` §19  
**Status:** complete  
**Started:** 2026-05-21  
**Completed:** 2026-05-21  
**Target SPEC:** `.work/features/pairing-api/20260520-SPEC.md` (+ prompter-ui R10–R11)

### Tasks

| ID | Description | Completed | Notes |
|------|-------------|-----------|-------|
| M5-T1 | Redis client wrapper | 2026-05-21 | `tp_platform/redis.py` |
| M5-T2 | Session create | 2026-05-21 | `pairing/service.py`, `models.py` |
| M5-T3 | Rate limiter per IP | 2026-05-21 | `tp_platform/rate_limit.py` |
| M5-T4 | Claim endpoint + delete-on-read | 2026-05-21 | `pairing/routes.py`; 410 tombstone |
| M5-T5 | RFC 7807 errors | 2026-05-21 | `tp_platform/errors.py` |
| M5-T6 | Pairing metrics | 2026-05-21 | `pairing/metrics.py` |
| M5-T7 | pytest pairing suite | 2026-05-21 | `api/tests/pairing/` — 8 tests |
| M5-T8 | Frontend relay handoff UI | 2026-05-21 | `frontend/src/pairing/*` |
| M5-T9 | Cross-model security review (W3) | 2026-05-21 | MOD-06 M5 review doc |

### Acceptance criteria (verified)

- [x] pairing-api SPEC **R1–R11** covered by pytest (`api/tests/pairing/`)
- [x] Delete-on-read: second claim 410; expired 404
- [x] OTP lockout (423); rate limits (429)
- [x] No script/OTP/token in application logs (R11 test)
- [x] Frontend relay: create URL+OTP; claim → storage → `/play`
- [x] API `pytest`, `ruff`, `pyright` exit 0 in container
- [x] FE `npm test`, `lint`, `typecheck` exit 0 — 50/50 pass

### Validation (2026-05-21)

- [x] `pytest tests/pairing/ -q` — 8/8 pass
- [x] `pytest tests/ -q` — 9/9 pass
- [x] `ruff check .` / `pyright .` — exit 0
- [x] `npm test` — 50/50 pass
- [x] `npm run lint` / `npm run typecheck` — exit 0
- [x] Manual curl relay smoke (create → claim → 410)
- [ ] Full desktop→mobile UX walkthrough — deferred to M6 E2E

### Concept / NFR registry

| Concept id | Status | Evidence |
|------------|--------|----------|
| MOD-01 | done 2026-05-21 | FE↔API `pairing/client.ts` |
| MOD-04 | done 2026-05-21 | Redis relay ops in security review |
| MOD-06 | done 2026-05-21 | `.work/context/20260521-MOD-06-M5-security-review.md` |

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
