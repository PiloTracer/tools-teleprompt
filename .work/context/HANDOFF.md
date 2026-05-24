# HANDOFF - session boundary

## Session status

**Closed:** 2026-05-24 — Adaptive scroll **four viewport rules** wired to visible behaviour: viewport line estimate when SR locks off-screen (e.g. line 315 with ratio 15+), scoped top-band fallback, effective speed rounded **up** to 0.1× steps after each rule multiplier, slider minimum **0.1×**. Vitest **196/196**, lint + typecheck clean. Diagnostic `[adaptive]` / `[SR]` logs retained for hardware confirmation.

**Updated:** 2026-05-24

**Repository state:** v0.1.0. M1–M8 complete. Adaptive teleprompter: SR + DOM line offsets + 4-rule resolver (`useAdaptiveScroll.ts`). Rules apply from **effective** line position (SR when plausible, else viewport estimate). **Committed** on `main` this close (see git log). `deploy/docker-compose.yml` env_file tweak left **uncommitted** (protected file — owner review).

**Plan-master-ready:** 2026-05-20

**Foundation-complete:** yes

**Implementation-ready:** yes (master plan Approved v1.2 — M8)

**Recommended pick-up file:** `.work/plans/NEXT.md`

**Lost or new?** Read `.ai/START_HERE.md` and `README.md`.

---

## Waivers (plan-master-ready)

| ID | Waiver | Owner action |
|----|--------|--------------|
| W1 | `.cursorrules` REPLACE tokens | **Cleared** M1-T8 (bootstrap line remains) |
| W2 | UNKNOWNS U1, U6, U8 open | **Cleared** 2026-05-21 (M6-T8 — defaults in registry) |
| W3 | Cross-model review not executed | **Cleared** M5/M6/M7/M8 (MOD-06 review docs) |
| W4 | Docker compose files not committed | **Cleared** 2026-05-21 (`approve compose`) |
| W5 | M3 manual mobile viewport check | **Cleared** M4 offline e2e + responsive CSS |
| W6 | M4 Lighthouse PWA audit | Manual before production deploy |

---

## Fresh start — next session

1. `@session-control start`
2. **PRIORITY:** hardware test — hard refresh, Sync + Play, Spanish script. In `[adaptive]` logs confirm `rate` **and** `effectiveSpeed` change (e.g. base 0.1× + Rule 3 → `effectiveSpeed: 0.2`). Expect `lineSource: "viewport"` when SR `readLineRatio` is off-screen.
3. If behaviour is good, strip diagnostic `console.log` from `useAdaptiveScroll.ts`, `useSpeechTracker.ts`, `useVoiceActivity.ts`.
4. `.work/plans/NEXT.md` · production deploy (`deploy/README.md` + `.env.prd`)
5. Optional: commit `deploy/docker-compose.yml` env_file default if approved

---

## Open issues — adaptive sync (live)

| # | Symptom | Hypotheses | Suggested investigation |
|---|---------|-----------|------------------------|
| A1 | **Mitigated 2026-05-24 (close):** SR locking on distant lines (ratio > 1) forced Rule 4 at 1× always — fixed with `estimateReadingLineFromViewport` + `pickEffectiveReadingLine`. Remaining risk: SR `null` / `no-speech` → Rule 4 only until first match. | SR language detection may start `en` before `es`; matcher can still jump ahead mid-script. | 1. Confirm `[adaptive]` shows `lineSource: viewport` and `rate` 0.5/1/1.3 when reading.<br>2. If SR never matches, check mic and `[SR] error`.<br>3. Tune `matchTranscriptToLine` window if SR line index still drifts. |
| A2 | (Watch-out, not yet reported) Background noise or HVAC could keep VAD above the 0.022 RMS threshold and prevent Rule 4 from firing in true silence. | Energy threshold too low for noisy rooms. | Optionally surface threshold in Settings, or add an auto-calibration window (sample noise floor for 1 s on first sync). |

---

## Gate snapshot

| Phase | Status |
|-------|--------|
| P0–P6 foundation | done |
| plan-master-ready | **yes** (2026-05-20) |
| Master plan | **Approved** v1.2 (`20260521-full-plan.md`) |
| Implementation-ready | **yes** |
| M1–M7 | **complete** 2026-05-21 |
| M8 adaptive teleprompter | **complete** 2026-05-23; **iteration 4** 2026-05-24 close — viewport effective line, rounded effective speed, 0.1× min; vitest 196/196 |

---

## Open owner actions

| # | Action |
|---|--------|
| 1 | Commit uncommitted M7 work (`@session-control close commit`) | **Done** 2026-05-21 |
| 2 | Hotspot: set `PUBLIC_ORIGIN` + `API_PUBLIC_BASE_URL` in `.env.dev`; restart stack (`bin/start.sh dev restart`) | **Done** 2026-05-21 (`.env.dev` local; docs in README) |
| 3 | Production: set `API_OTP_HMAC_SECRET`; confirm Caddy forwards client IP |
| 4 | Optional: Lighthouse PWA audit (W6) |
| 5 | Manual phone test on hotspot IP (LAN + multi-QR) — re-scan all multi-QR codes after deploy |

---

## What this cycle produced

| Date | Session | Artifacts |
|------|---------|-----------|
| 2026-05-20 | plan-foundation greenfield | P0–P1 scope + architecture foundation |
| 2026-05-20 | P2–P4 | ADRs 001–005, SPECs ×3, cross-cutting standards |
| 2026-05-20 | P5–P6 | compose proposal, README, ops artifacts |
| 2026-05-20 | certify | plan-master-ready (pass with waivers) |
| 2026-05-21 | plan-master greenfield | `20260521-full-plan.md` + trace matrix |
| 2026-05-21 | M1 implementation | `frontend/`, `api/`, `deploy/`, `bin/start.sh`, `.github/workflows/ci.yml`, `.env.example` |
| 2026-05-21 | M1 complete + MOD-06 | `.work/context/20260521-MOD-06-M1.md` |
| 2026-05-21 | M2 markdown pipeline | `frontend/src/markdown/*`, XSS tests |
| 2026-05-21 | M2 complete + MOD-06 | `.work/context/20260521-MOD-06-M2.md` |
| 2026-05-21 | M3 prompter UI | `frontend/src/prompter/*`, `routes/`, `lib/i18n/`, `tests/prompter.test.tsx` |
| 2026-05-21 | session close commit push | M2+M3 bookends + application code on `main` |
| 2026-05-21 | M3 complete + MOD-06 | `.work/context/20260521-MOD-06-M3.md`; gates 29/29 pass |
| 2026-05-21 | M4 player + PWA | `Player.tsx`, hooks, `pwa/registerSW.ts`, `vite-plugin-pwa`, `tests/e2e/offline.spec.ts`, `bin/e2e-offline.sh` |
| 2026-05-21 | session close commit push | M3 bookends + M4 player/PWA on `main` |
| 2026-05-21 | M5 pairing API + relay | `api/src/pairing/*`, `tp_platform/{redis,errors,rate_limit}.py`, `api/tests/pairing/`, `frontend/src/pairing/*` |
| 2026-05-21 | M5 complete + MOD-06 | `.work/context/20260521-MOD-06-M5-security-review.md`; API 9/9 + FE 50/50 pass |
| 2026-05-21 | session close commit push | M5 pairing API + relay handoff on `main` |
| 2026-05-21 | M6 QR + E2E + hardening | `qrThreshold/Encode/Decode`, `QrConsume`, handoff E2E, CSP, `deploy/README.md` |
| 2026-05-21 | M6 complete + MOD-06 | `.work/context/20260521-MOD-06-M6-security-review.md`; FE 53/53 + E2E 3/3 pass |
| 2026-05-21 | session close commit push | M6 QR handoff, E2E, CSP, deploy runbook on `main` |
| 2026-05-21 | dev stack hardening | `bin/start.sh` menu + reliability; `bin/e2e-handoff.sh`; `.env.example` 9xxx ports; compose `-dev` container names |
| 2026-05-21 | session close commit push | dev stack manager, ports, and Docker naming on `main` |
| 2026-05-21 | plan-master revise | M7 approved — LAN + multi-QR (ADR 006); full plan v1.1 |
| 2026-05-21 | M7 serverless handoff | ADR 006; LAN API (`lan_store.py`); multi-QR; mode router; SPEC amendments; E2E LAN/multi-QR |
| 2026-05-21 | M7 complete + MOD-06 | `.work/context/20260521-MOD-06-M7-security-review.md`; API 18/18 + FE 64/64 + E2E 5/5 |
| 2026-05-21 | Hotspot handoff hardening | `public_config.py`, `publicOrigin.ts`, CSP, `start.sh` env context, multi-QR `localStorage`, player mobile UI |
| 2026-05-21 | session close commit push | handoff origin + multi-QR mobile + dev stack on `main` |
| 2026-05-21 | session close commit push | README v0.1.0 release + GitHub release |
| 2026-05-22 | Player UX polish | side/bottom clearance, scroll tail, compact toolbar, fullscreen-only bottom controls |
| 2026-05-22 | session close commit push | player layout improvements on `main` |
| 2026-05-23 | UI Design OS + S4 handoff | `.ai.ui/`, `.work.ui/`, tokens, ds components, S1–S4 screens, Playwright S1–S4, `bin/start.sh` prd env |
| 2026-05-23 | session close commit push | UI framework + handoff polish + player lever dock on `main` |
| 2026-05-23 | session close commit push | UI S5, player toolbar, env example alignment, handoff UX on `main` |
| 2026-05-23 | Dark theme contrast fix | `themes/dark.css`, form controls, contrast + S2 dark a11y e2e; FE 90/90 pass |
| 2026-05-23 | M8 adaptive teleprompter (T1–T7) | SPECs + plan v1.2; `prompter/adaptive/*`; settings/mic UI; vitest adaptive + player/settings |
| 2026-05-23 | M8 complete (T8–T11) | Editor markup hints; `adaptiveInvariants.test.ts`; `adaptive-player.spec.ts`; MOD-06 M8 review; FE 142/142 |
| 2026-05-23 | session close commit | M8 T8–T11 + iteration bookends on `main` |
| 2026-05-23 | Player scroll fix | `useScroll`, `useAdaptiveScroll`, `Player.tsx`, `prompter.css`; vitest 147/147 |
| 2026-05-24 | Adaptive sync hybrid rearchitect | `useSpeechTracker.ts` (SR + lang auto-detect + retry), `matchScriptLine.ts` (fuzzy match + NFD normalise), `speech-recognition.d.ts`, `useAdaptiveScroll.ts` (hybrid VAD+SR+viewport-zones), `useVoiceActivity.ts` (debug logs), `Player.tsx` (VAD+SR), `Settings.tsx` (SR gate); vitest 185/185 |
| 2026-05-24 (late) | Adaptive sync iteration 2 | VAD-primary resolver (no longer freezes on SR drop-outs); strict `areAllVisibleLinesMeta` Rule 5; red mic button on language lock (`tp-player-mic--calibrated`); `READ_TOP_STOP_MAX` raised 0.12→0.25 for SR/scroll latency cushion; **Rule 4 cold-start grace removed** (silence holds even before first match); VAD hangover trimmed 1200→700 ms; **feature hard-gated on `isSpeechRecognitionSupported()` at the Player boundary** (PlayerControls accepts `adaptiveActive` prop; mic button no longer renders in Safari/Firefox/iOS even with saved `adaptiveEnabled=true`); console-log noise stripped from `useScroll`, `useVoiceActivity`, `useSpeechTracker`. Files touched: `Player.tsx`, `PlayerControls.tsx`, `useAdaptiveScroll.ts`, `useVoiceActivity.ts`, `useSpeechTracker.ts`, `useScroll.ts`, `prompter.css`, `useAdaptiveScroll.test.ts`, `player.test.tsx`. Vitest **197/197**, lint clean, typecheck clean. **Live hardware: open issue A1** — reader on top-edge line, line still disappears before Rule 1 halts scroll. |
| 2026-05-24 (late, iteration 3) | Adaptive Rule 1 STOP → soft 0.5× brake | Rule 1 returns `TOP_SLOWDOWN_FACTOR = 0.5` in top 30 % band. |
| 2026-05-24 (close) | Adaptive rules 1–4 + viewport + rounded speed | `estimateReadingLineFromViewport`, `pickEffectiveReadingLine`, `applySpeedMultiplierRoundedUp`, `SPEED_MIN = 0.1`, SR stack (`useSpeechTracker`, `matchScriptLine`, `measureLineOffsets`), markdown `data-line-*` tags. Vitest **196/196**. |

---

## Explicit unknowns

See `.work/plans/UNKNOWNS.md` — U9 resolved (M7 LAN + multi-QR). U1/U6/U8 closed M6.

---

## Last verification (2026-05-24 close)

```
docker exec tools-teleprompt-frontend-dev sh -c "cd /app && npm test -- --run"  → 196/196
docker exec tools-teleprompt-frontend-dev sh -c "cd /app && npm run lint"       → exit 0
docker exec tools-teleprompt-frontend-dev sh -c "cd /app && npm run typecheck" → exit 0
```

Playwright `adaptive-player` not rerun this close — last green 2026-05-23.

---

## Cross-LLM verification

- **M5-T9:** pairing security paths — done
- **M6-T6:** markdown-render + ADR 005 — done (MOD-06 M6 review doc)
- **M7-T9:** LAN + multi-QR handoff — done (MOD-06 M7 review doc)
- **M8-T11:** adaptive teleprompter mic/VAD — done (MOD-06 M8 review doc); optional independent second-model review

### UI layer (UI Design OS)

- **Framework:** `.ai.ui/` (sibling to `.ai/`)
- **UI handoff:** `.work.ui/context/HANDOFF_UI.md`
- **UI next:** `.work.ui/plans/NEXT_UI.md`
- **Status:** **S1–S5 complete** 2026-05-23 · **ui-implementation-ready: yes**
- **Next UI:** Production deploy (Agent OS track) · optional UIS-06 record
