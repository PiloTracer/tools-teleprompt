# NEXT - planning backlog

**Updated:** 2026-05-23 (session close — M8 T1–T7 committed)

---

## Recommended next

1. **`@code-implementation continue`** — M8-T8 editor markup hint copy
2. **Production deploy** (parallel) — `deploy/README.md` (set `PUBLIC_ORIGIN`, `API_OTP_HMAC_SECRET`, confirm Caddy client IP)
3. Manual phone test on hotspot IP (LAN + multi-QR — scan all codes after refresh)

---

## Current iteration — M8: Adaptive teleprompter (mic VAD + read zone)

**Milestone ref:** M8 · `.work/plans/full/20260521-full-plan.md` § M8  
**Status:** in-progress  
**Started:** 2026-05-23

**Target SPECs:**

- `.work/features/adaptive-teleprompter/20260523-SPEC.md` (Approved)
- `.work/features/adaptive-teleprompter/20260523-SPEC-amendment-01-simplify-read-zone.md` (Approved)
- `.work/features/markdown-render/20260523-SPEC-amendment-01-adaptive-meta-blockquote.md` (Approved)
- `.work/features/prompter-ui/20260523-SPEC-amendment-02-adaptive.md` (Approved, M8-T1)

### In scope

- Browser mic + Web Audio VAD (device-local; no cloud STT)
- Read zone scroll (35–48% band, center ~42%); baseline speed while speaking; pause on silence
- Meta line parser + 2× skim; markdown `tp-meta` blockquotes
- Settings: `adaptiveEnabled`, `adaptiveAutoSync` (both default off)
- Player mic button on primary toolbar; sync toggle
- Editor hints for markup syntax
- vitest + Playwright (mocked mic); MOD-06 review (M8-T11)

### Out of scope (explicit)

- Cloud STT, Web Speech API, npm speech/ML libraries
- Word-level / transcript alignment
- API, Redis, or backend changes
- Moving the speed slider during adaptive sync (R16)
- Visual read-zone debug overlay (product v1)

### Tasks

| ID | Description | Files | FR/NFR | Status | Notes |
|----|-------------|-------|--------|--------|-------|
| M8-T1 | prompter-ui SPEC amendment: adaptive settings + player mic | `.work/features/prompter-ui/20260523-SPEC-amendment-02-adaptive.md` | FR-13 | done 2026-05-23 | S · docs only · SC1: scope clean; no code paths |
| M8-T2 | Script line parser + meta classification | `frontend/src/prompter/adaptive/parseScriptLines.ts`, `frontend/src/prompter/adaptive/types.ts`, `frontend/tests/adaptive/parseScriptLines.test.ts` | FR-13 | done 2026-05-23 | M · SC1: regex edge cases covered in vitest |
| M8-T3 | markdown-render: `tp-meta` blockquote + `isMetaSourceLine` | `frontend/src/markdown/render.ts`, `frontend/src/markdown/sanitize.ts`, `frontend/tests/markdown.test.tsx` | FR-13, NFR-03 | done 2026-05-23 | M · SC1: XSS corpus re-run pass |
| M8-T4 | Web Audio VAD hook | `frontend/src/prompter/adaptive/useVoiceActivity.ts`, `frontend/tests/adaptive/useVoiceActivity.test.ts` | FR-13, NFR-12, R13 | done 2026-05-23 | M · SC1: hangover + I2 getUserMedia gate tested |
| M8-T5 | Adaptive scroll + read zone; integrate player | `frontend/src/prompter/adaptive/useAdaptiveScroll.ts`, `frontend/src/prompter/Player.tsx`, `frontend/src/prompter/useScroll.ts`, `frontend/tests/adaptive/useAdaptiveScroll.test.ts` | FR-13, G7 | done 2026-05-23 | L · SC1: read zone band + VAD pause + 2× meta tested |
| M8-T6 | Settings toggles + persist | `frontend/src/prompter/Settings.tsx`, `frontend/src/prompter/storage.ts`, `frontend/src/lib/i18n/en.ts`, `frontend/tests/settings.test.tsx` | FR-13 | done 2026-05-23 | M · SC1: R18–R19 defaults; R24 privacy copy |
| M8-T7 | Player mic button + permission UX | `frontend/src/prompter/PlayerControls.tsx`, `frontend/src/styles/prompter.css`, `frontend/tests/player.test.tsx` | FR-13, NFR-07, R13 | done 2026-05-23 | M · SC1: also wired Player.tsx + en.ts for sync toggle |
| M8-T8 | Editor markup hint copy | `frontend/src/prompter/Editor.tsx`, `frontend/src/lib/i18n/en.ts` | FR-13 | pending | S |
| M8-T9 | vitest adaptive suite (parser, VAD, read zone, meta 2×, I1–I2) | `frontend/tests/adaptive/*.test.ts` | FR-13 | pending | M · consolidate/fill gaps from T2–T5 |
| M8-T10 | Playwright adaptive e2e (mocked mic) | `frontend/tests/e2e/adaptive-player.spec.ts` | FR-13, NFR-07 | pending | M |
| M8-T11 | MOD-06 review + `@code-verify milestone` | `.work/context/20260523-MOD-06-M8.md`, `.work/plans/NEXT.md` | NFR-12, MOD-06 | pending | S |

### Acceptance criteria

- [ ] Adaptive off → zero `getUserMedia`; player unchanged (SPEC I2, R2)
- [ ] Sync active + VAD on → baseline scroll; read line stays in 35–48% viewport band (amendment 01 R8, R8b)
- [ ] Silence (debounced) → scroll pauses while playing (R8)
- [ ] Sync off / mic off → fixed baseline speed (R5, R9)
- [ ] Meta lines at 2×; spoken lines not skipped (amendment R14–R15)
- [ ] Settings + mic UI per R1, R1b, R4–R6b; speed slider does not move (R16)
- [x] Blockquote renders `class="tp-meta"` (markdown-render amendment R9)
- [ ] FR-13 / AC-13 satisfied; `@code-verify milestone` pass

### Validation steps

- [ ] `docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npm test"`
- [ ] `docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npm run lint"`
- [ ] `docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npm run typecheck"`
- [ ] `docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npx playwright test adaptive-player"` (mocked mic)
- [ ] `@code-verify milestone` (M8-T11)

### Owner blockers

- none

### Concept / NFR registry (this iteration)

| Concept id | Applies | Status | Evidence / trigger |
|------------|---------|--------|-------------------|
| MOD-01 | yes | pending | New `prompter/adaptive/` module; no pairing-api deps |
| MOD-02 | no | n/a | No network hop (VAD local-only) |
| MOD-03 | no | n/a | No billable vendor |
| MOD-04 | no | n/a | Client-only; no new on-call surface |
| MOD-05 | yes | pending | Modular monolith in frontend |
| MOD-06 | yes | pending | M8-T11 before **complete** |

### Cross-LLM verification

- Triggered: no (run at M8-T11 with mic privacy + scroll controller focus)

### Done this iteration

| Task | Completed | Notes |
|------|-----------|-------|
| M8-T1 | 2026-05-23 | prompter-ui amendment 02 Approved |
| M8-T2 | 2026-05-23 | parseScriptLines + vitest (12 tests) |
| M8-T3 | 2026-05-23 | tp-meta blockquote + isMetaSourceLine re-export |
| M8-T4 | 2026-05-23 | useVoiceActivity + vitest (11 tests) |
| M8-T5 | 2026-05-23 | useAdaptiveScroll + Player/VAD wiring; 15 tests |
| M8-T6 | 2026-05-23 | adaptive settings toggles + storage merge |
| M8-T7 | 2026-05-23 | mic button + permission hint; player.test 30 pass |

---

## Previous iteration

M7 complete — see **Done — M7 iteration (archived)** below.

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
| M6 QR handoff, E2E, hardening | 2026-05-21 |
| M6 formal complete | 2026-05-21 |
| MOD-06 (M6) | 2026-05-21 |
| Dev stack manager + env ports/naming | 2026-05-21 |
| Hotspot handoff origin + multi-QR mobile fix | 2026-05-21 |
| README v0.1.0 release + GitHub release | 2026-05-21 |
| Player side/bottom clearance + fullscreen toolbar | 2026-05-22 |
| M7 serverless handoff approved (LAN + multi-QR) | 2026-05-21 |
| M7 formal complete | 2026-05-21 |
| MOD-06 (M7) | 2026-05-21 |
| Dark theme editor/preview inset contrast | 2026-05-23 |
| M8 adaptive teleprompter planned (plan v1.2) | 2026-05-23 |

---

## Done — M7 iteration (archived)

**Milestone ref:** M7 · `.work/plans/full/20260521-full-plan.md` § M7 · ADR 006  
**Status:** complete  
**Started:** 2026-05-21  
**Completed:** 2026-05-21  
**Target SPECs:** `.work/features/prompter-ui/20260521-SPEC-amendment-01.md`, `.work/features/pairing-api/20260521-SPEC-amendment-01.md`

### Tasks

| ID | Description | Completed | Notes |
|------|-------------|-----------|-------|
| M7-T1 | ADR 006 serverless handoff modes | 2026-05-21 | `.work/decisions/20260521-006-serverless-handoff-modes.md` |
| M7-T2 | LAN one-shot API | 2026-05-21 | `lan_store.py`, routes, `test_lan.py` |
| M7-T3 | LAN handoff UI + consume | 2026-05-21 | `LanConsume.tsx`, `client.ts` |
| M7-T4 | Multi-QR chunk encode/decode + UX | 2026-05-21 | `qrChunk*.ts`, `MultiQr*.tsx` |
| M7-T5 | Handoff mode router | 2026-05-21 | `resolveHandoffMode`, `HandoffCreate.tsx` |
| M7-T6 | SPEC amendments | 2026-05-21 | prompter-ui + pairing-api amendment 01 |
| M7-T7 | Playwright E2E LAN + multi-QR | 2026-05-21 | 5/5 handoff E2E pass |
| M7-T8 | D14 QR limit docs | 2026-05-21 | `qrConstants.ts`, `deploy/README.md`, `.env.example` |
| M7-T9 | MOD-06 + milestone verify | 2026-05-21 | pass with gaps (uncommitted tree) |

### Acceptance criteria (verified)

- [x] LAN (J2c): API + E2E; no Redis key (`test_lan.py` I3)
- [x] Multi-QR (J2d): E2E reassembly; zero API on consume
- [x] Fallback chain: single QR → multi-QR → LAN → relay (`resolveHandoffMode`)
- [x] NFR-11: LAN log test; no script in pairing logs
- [x] Regression: relay + single-QR E2E pass
- [x] `@code-verify milestone` pass with gaps at complete

### Validation (2026-05-21)

- [x] API `pytest tests/ -q` — 18/18 pass
- [x] API ruff + pyright — exit 0
- [x] FE `npm test` — 64/64 pass
- [x] FE lint + typecheck — exit 0
- [x] Playwright handoff — 5/5 pass
- [ ] Manual hotspot phone test — unverified (env docs in M7-T8)
- [ ] Redis audit on live LAN create — covered by `test_lan_create_does_not_write_redis`

### Concept / NFR registry

| Concept id | Status | Evidence |
|------------|--------|----------|
| MOD-01 | done 2026-05-21 | LAN FE↔API; MOD-06 M7 review |
| MOD-04 | done 2026-05-21 | Hotspot deploy docs |
| MOD-06 | done 2026-05-21 | `.work/context/20260521-MOD-06-M7-security-review.md` |

---

## Done — M6 iteration (archived)

**Milestone ref:** M6 · `.work/plans/full/20260521-full-plan.md` §19  
**Status:** complete  
**Started:** 2026-05-21  
**Completed:** 2026-05-21  
**Target SPEC:** `.work/features/prompter-ui/20260520-SPEC.md` (R9–R11)

### Tasks

| ID | Description | Completed | Notes |
|------|-------------|-----------|-------|
| M6-T1 | QR threshold + relay fallback | 2026-05-21 | `qrThreshold.ts`, `HandoffCreate.tsx` |
| M6-T2 | QR encode/decode + qrcode lib | 2026-05-21 | `qrEncode.ts`, `qrDecode.ts` |
| M6-T3 | QR consume route | 2026-05-21 | `QrConsume.tsx`, `/handoff/receive` |
| M6-T4 | Playwright E2E relay + QR | 2026-05-21 | `handoff-relay.spec.ts`, `handoff-qr.spec.ts` |
| M6-T5 | CSP + security headers | 2026-05-21 | `deploy/Caddyfile` |
| M6-T6 | Cross-model review (W3) | 2026-05-21 | MOD-06 M6 review doc |
| M6-T7 | Production runbook + env | 2026-05-21 | `deploy/README.md`, `.env.example` |
| M6-T8 | UNKNOWNS U1/U6/U8 | 2026-05-21 | Defaults confirmed in registry |
| M6-T9 | Milestone verify prep | 2026-05-21 | `@code-verify milestone` pass at complete |

### Acceptance criteria (verified)

- [x] QR threshold 8192 B compressed; auto-fallback to relay (R9/R10)
- [x] QR consume → localStorage → player; no API body (AC-3)
- [x] Relay handoff E2E (AC-2)
- [x] QR handoff E2E (AC-3)
- [x] CSP headers on Caddy (NFR-03)
- [x] No script/OTP/token/fragment in logs (R11, I2)
- [x] UNKNOWNS U1/U6/U8 resolved
- [x] `@code-verify milestone` pass at complete

### Validation (2026-05-21)

- [x] FE `npm test` — 53/53 pass
- [x] FE `npm run lint` / `npm run typecheck` — exit 0
- [x] API `pytest tests/ -q` — 9/9 pass
- [x] Playwright handoff — 2/2 pass
- [x] Playwright offline — 1/1 pass (`bin/e2e-offline.sh`)
- [x] CSP headers — curl verified on Caddy :8080
- [ ] Coverage ≥80% on `markdown/` + `pairing/` — not measured (deferred)
- [ ] Lighthouse PWA audit — deferred (W6)

### Concept / NFR registry

| Concept id | Status | Evidence |
|------------|--------|----------|
| MOD-01 | done 2026-05-21 | QR client-only vs relay API |
| MOD-04 | done 2026-05-21 | deploy/README + Caddy CSP |
| MOD-06 | done 2026-05-21 | `.work/context/20260521-MOD-06-M6-security-review.md` |

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
