# NEXT - planning backlog

**Updated:** 2026-07-10 (pass eight — decision tree closed) — Owner confirmed on device that one-shot mode (pass seven) "deactivates automatically" — unacceptable. Combined continuous-restart (pass six, keeps sync engaged) with the backoff mitigation (reduces, does not eliminate, notification frequency). This is the final state under the owner's two hard constraints (must stay engaged until explicit tap-off; won't pay for streaming ASR). Corrected inaccurate prior claims: mobile SR dedup and viewport-range hints are **not wired into application code** (utilities + tests only). Device verification is the next gate.

---

## ⚠️ Process note — multiple concurrent sessions edited this same issue

Passes six/seven were worked by **two different chat sessions** at the same time without shared context, producing directly conflicting fixes. That's resolved now (pass eight combines both learnings), but if you're starting a new session on this: read HANDOFF's full pass 1–8 history first and confirm what's actually on disk (`git diff frontend/src/prompter/adaptive/useSpeechTracker.ts`) before changing anything here — **the decision tree below is closed**, don't re-litigate it without new device-test information.

---

## Recommended next

> **Read first:** [`../context/20260526-adaptive-relock-r4-r6-retrospective.md`](../context/20260526-adaptive-relock-r4-r6-retrospective.md). Rounds 4–10 are documented as dead ends with verdicts. Do **not** repeat: scroll-freeze during silence (R8/R9), permissive matcher floor below 4/3 (R10), raised matcher thresholds above 4/3 (R5), `onspeechstart` instant snap (R4), restoring `readingWordIndex` in failure paths (R6).

0. ✅ **Mic notification loop — decision tree closed (pass eight)** — 2026-07-10. **Confirmed root cause:** Android Chrome force-ends `SpeechRecognition` after a few seconds of silence regardless of `continuous = true` (Chromium issue **41297427**); there is no web API to suppress the OS mic notification that replays on every restart, and no way to keep the mic "on" without periodic restarts. Two options were tried and both had real problems: **continuous+restart** (pass six — notification loops repeatedly) and **one-shot/no-restart** (pass seven — owner confirmed on device it "deactivates automatically", unacceptable). Owner has ruled out streaming ASR on cost. **Final implementation:** always restart on `onend` (sync stays engaged until explicit ES/EN tap-off, matching what the owner needs) **plus** exponential backoff (`restartBackoff.ts`: 280ms → capped 8s) applied only to consecutive restarts where the *previous* SR instance heard zero speech; resets to 280ms the instant real speech is heard, so active reading is never delayed. `onSyncEnded` callback now only fires on a genuine mic-permission-denied error, not on ordinary silence-driven ends — the button stays "on" for the whole session as intended. FE 208/208 pass; lint/typecheck clean. **Not device-verified.**
   - **What to expect on device:** sync should no longer silently drop out during normal reading pauses (that was the pass-seven problem). The OS mic notification will still fire, but less often during idle/long-pause stretches than a flat restart would. It will **not** be silent — that's only achievable with streaming ASR.
   - **If this is still unacceptable:** the only remaining lever is streaming ASR (AssemblyAI / Deepgram) — there is no third free option, this is a genuine Web Speech API / Android Chrome ceiling that several independent upstream bug reports confirm.
1. ⚠️ **Mobile SR dedup** — `speechResultUtils.ts` written 2026-07-10 with passing unit tests, but **not imported/wired into `useSpeechTracker.ts`**. Decide whether to wire it in (isolated, device-tested change) or drop it.
2. ✅ **Compound word split** — implemented 2026-07-10 in `annotateScriptWords.ts`, wired into `Player.tsx`; hyphenated tokens and URL-like tokens split into pronounceable word spans.
3. ⚠️ **IntersectionObserver paragraph hints** — `useVisibleWordRange.ts` written 2026-07-10 with passing unit tests, but **not wired into `Player.tsx`** — no `sync.viewportRange` log is currently emitted anywhere.
4. **Device-test on Android Chrome (do this before any more matcher/sync code changes)** — enable sync debug (`localStorage.setItem('tp:debug','1')`) and verify with pass eight's code on disk: (a) tapping ES/EN and reading continuously with normal pauses — sync should stay engaged the whole time, no silent drop-outs; (b) check `sr.end` debug log entries for `consecutiveSilentRestarts`/`nextRestartDelayMs` climbing during idle stretches and resetting to 0/280ms once you start speaking; (c) is the notification frequency noticeably lower than before during idle periods (it will not be zero); (d) matcher advances through hyphenated/URL tokens (item 2); (e) decide on items 1/3.
5. **Decision point (elevated priority, blocked on item 4's result)** — if pass eight is an acceptable UX (sync stays engaged, notification frequency tolerable even though nonzero), close the iteration. If the notification frequency is still unacceptable to the owner, the only remaining lever is a streaming ASR provider (AssemblyAI / Deepgram — fixes it completely but costs money, already ruled out once). There is no other free option; this is a real Web Speech API / Android Chrome ceiling (Chromium issue 41297427), not an implementation bug.
6. Manual device verify player layout — bottom slider 20–50%; no horizontal scrollbar on long scripts.
7. Production deploy when owner ready (`deploy/README.md`) — speech-sync residual issues do not block other features.
8. Manual phone test on hotspot IP (LAN + multi-QR).
9. Production frontend deployment: switch from Vite dev server to the static production image (`frontend/Dockerfile` target `prod`). See `deploy/README.md` § "Production frontend".

---

## Blocked on owner / environment

| Item | Blocker |
|------|---------|
| Production deploy | Owner sign-off + env secrets (`API_OTP_HMAC_SECRET`) |
| Adaptive mic sync sign-off | **R4–R10 all rejected on device.** Round-3 baseline (`33234b1`) plus Phases 1–3 incremental fixes are now on disk; device verification pending. If residual "skipped lines on resume" remains, the realistic ceiling of browser SR has been reached. |
| Mic notification loop | **Decision tree closed (pass eight)** — continuous mode + backoff mitigation; mic/sync stays engaged, notification frequency reduced but nonzero (platform limitation, Chromium issue 41297427). Device test needed to confirm the reduced frequency + no drop-outs are both acceptable; if not, only remaining lever is the ASR provider decision below. |
| ASR provider decision | Owner — continue browser SR (accept notification-loop mitigation + matcher ceiling) or move to streaming ASR (fixes both) |
| Player bottom clearance sign-off | Manual device check not yet recorded |
| Mobile editor nav | Fixed 2026-05-25 — verify on device after deploy |

---

## Current iteration

**M8 complete** — see **Done — M8 iteration (archived)** below. No active Agent OS iteration; next milestone TBD (`@plan-master revise` if scope expands).

---

## Previous iteration

M8 complete — see **Done — M8 iteration (archived)** below.

---

## Done — M8 iteration (archived)

**Milestone ref:** M8 · `.work/plans/full/20260521-full-plan.md` § M8  
**Status:** complete  
**Started:** 2026-05-23  
**Completed:** 2026-05-23  
**Target SPECs:**

- `.work/features/adaptive-teleprompter/20260523-SPEC.md` (Approved)
- `.work/features/adaptive-teleprompter/20260523-SPEC-amendment-01-simplify-read-zone.md` (Approved)
- `.work/features/markdown-render/20260523-SPEC-amendment-01-adaptive-meta-blockquote.md` (Approved)
- `.work/features/prompter-ui/20260523-SPEC-amendment-02-adaptive.md` (Approved)

### Tasks

| ID | Description | Completed | Notes |
|------|-------------|-----------|-------|
| M8-T1 | prompter-ui SPEC amendment | 2026-05-23 | amendment 02 Approved |
| M8-T2 | Script line parser + meta classification | 2026-05-23 | parseScriptLines + 12 vitest |
| M8-T3 | markdown-render tp-meta blockquote | 2026-05-23 | XSS corpus pass |
| M8-T4 | Web Audio VAD hook | 2026-05-23 | useVoiceActivity + 11 vitest |
| M8-T5 | Adaptive scroll + read zone | 2026-05-23 | useAdaptiveScroll + Player; 15 vitest |
| M8-T6 | Settings toggles + persist | 2026-05-23 | R18–R19 defaults; R24 privacy copy |
| M8-T7 | Player mic button + permission UX | 2026-05-23 | player.test adaptive block |
| M8-T8 | Editor markup hint copy | 2026-05-23 | details/summary + i18n |
| M8-T9 | vitest adaptive suite | 2026-05-23 | adaptiveInvariants.test.ts |
| M8-T10 | Playwright adaptive e2e | 2026-05-23 | adaptive-player.spec.ts 4/4 |
| M8-T11 | MOD-06 + milestone verify | 2026-05-23 | `.work/context/20260523-MOD-06-M8.md` |

### Acceptance criteria (verified)

- [x] Adaptive off → zero `getUserMedia`; player unchanged (I2, R2)
- [x] Sync active + VAD on → read line in 35–48% band (R8, R8b)
- [x] Silence (debounced) → scroll pauses while playing (R8)
- [x] Sync off / mic off → fixed baseline speed (R5, R9)
- [x] Meta lines at 2×; spoken lines not skipped (R14–R15)
- [x] Settings + mic UI per R1, R1b, R4–R6b; speed slider unchanged (R16)
- [x] Blockquote renders `class="tp-meta"` (R9)
- [x] FR-13 / AC-13; `@code-verify milestone` pass

### Validation (2026-05-23)

- [x] FE `npm test` — 142/142 pass
- [x] FE lint + typecheck — exit 0
- [x] API `pytest tests/ -q` — 22/22 pass
- [x] Playwright `adaptive-player` — 4/4 (Playwright docker image)
- [ ] Manual mic/VAD tuning on real hardware — unverified (MOD-06 condition)
- [ ] Independent second-model cross-LLM — optional (MOD-06 doc from implementing agent)

### Concept / NFR registry

| Concept id | Status | Evidence |
|------------|--------|----------|
| MOD-01 | done 2026-05-23 | `prompter/adaptive/` isolated |
| MOD-05 | done 2026-05-23 | Frontend subfolder |
| MOD-06 | done 2026-05-23 | `.work/context/20260523-MOD-06-M8.md` |

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
| M8 formal complete | 2026-05-23 |
| Adaptive feature removed (revert to fixed-speed player) | 2026-05-24 |
| Player bottom clearance (viewport-% grid) + text wrap + speed 0.1–3× | 2026-05-24 |
| Adaptive speech sync restore (SR word matcher + skip-ahead + underline mark) | 2026-05-24 |
| Mic sync engagement fix (Play auto-enable + ES toggle syncActive) | 2026-05-24 |
| Mic device routing + SR track start (mic selector, label remap, Play no auto-sync) | 2026-05-24 |
| Mobile speech sync fixes (SR restart, center scroll, silence resume) | 2026-05-25 |
| Mobile editor nav fix (short labels, flex shrink) | 2026-05-25 |
| Adaptive sync tuning (silence 1.75s, matcher window, smooth scroll) | 2026-05-25 |
| Adaptive re-lock rearchitect (viewport-anchored matcher; two-stage silence; anti-wobble; drift-aware backward gap; cooldown) | 2026-05-26 |
| Adaptive re-lock rounds R8–R10 attempted and reverted (scroll-freeze + `findGlobalLock`); retrospective updated to cover R4–R10 dead ends | 2026-05-26 |

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
