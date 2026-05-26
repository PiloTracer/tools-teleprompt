# HANDOFF - session boundary

## Session status

**Closed:** 2026-05-25 — UIS-07 UX polish committed; Caddyfile mic permission fix; speech sync freeze on mobile discovered (open bug)

**Updated:** 2026-05-25

**Repository state:** v0.1.0. M1–M8 complete. **Adaptive speech sync** on `main`. **This session:** UIS-07 UX polish (Toggle DS, Settings refactor, QR encode hardening) + Caddyfile `microphone=(self)` fix enabling mic prompt on mobile Chrome. FE checks last green 2026-05-24 (157/157). **Open bug:** speech sync starts on mobile then freezes mid-script (see Open owner actions #8).

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
2. **Investigate speech sync freeze on mobile Chrome** (open bug): SR starts, recognises first lines, then stops advancing — scroll freezes mid-script. See § Open owner actions #8.
3. **Manual verify adaptive sync on device:** sequential read; no spurious 50+ word jumps; red underline tracks current line.
4. **Manual verify player layout:** Bottom slider 20–50% → empty band at bottom; no horizontal scrollbar.
5. Production deploy when owner ready (`deploy/README.md`).

---

## Gate snapshot

| Phase | Status |
|-------|--------|
| P0–P6 foundation | done |
| plan-master-ready | **yes** (2026-05-20) |
| Master plan | **Approved** v1.2 (`20260521-full-plan.md`) |
| Implementation-ready | **yes** |
| M1–M7 | **complete** 2026-05-21 |
| M8 adaptive teleprompter | **re-shipped** 2026-05-24 — speech sync + skip-ahead matcher (after interim removal `95f804e`) |

---

## Open owner actions

| # | Action |
|---|--------|
| 1 | Commit uncommitted M7 work (`@session-control close commit`) | **Done** 2026-05-21 |
| 2 | Hotspot: set `PUBLIC_ORIGIN` + `API_PUBLIC_BASE_URL` in `.env.dev`; restart stack (`bin/start.sh dev restart`) | **Done** 2026-05-21 (`.env.dev` local; docs in README) |
| 3 | Production: set `API_OTP_HMAC_SECRET`; confirm Caddy forwards client IP |
| 4 | Optional: Lighthouse PWA audit (W6) |
| 5 | Manual phone test on hotspot IP (LAN + multi-QR) — re-scan all multi-QR codes after deploy |
| 6 | Manual device check: bottom clearance + no horizontal scroll on play route |
| 7 | Manual device check: adaptive mic sync (sequential read + metadata skip) |
| 8 | **Bug:** speech sync starts on mobile Chrome (mic permission granted after Caddyfile fix), recognises initial lines, then freezes — no further SR events / scroll stops. Investigate `sr.error` / `sr.end` in console (`localStorage.setItem('tp:debug','1')`); likely SR session silently ending after first restart cycle on mobile. |

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
| 2026-05-24 | Adaptive sync hybrid rearchitect | `useSpeechTracker.ts`, `matchScriptLine.ts`, `useAdaptiveScroll.ts` (4-rule bands), VAD+SR |
| 2026-05-24 (close) | Adaptive rules 1–4 + viewport + rounded speed | committed `c459f06` |
| 2026-05-24 | Adaptive feature removed | `95f804e` — revert to fixed-speed player |
| 2026-05-24 (close) | Player bottom clearance + text wrap + speed 0.1–3× | `playerLayout.ts`, `Player.tsx`, `prompter.css`, `useViewportHeight`; vitest 92/92 |
| 2026-05-24 (close) | Adaptive speech sync restore | `prompter/adaptive/*`, word matcher skip-ahead gates, red underline mark; vitest 143/143 |
| 2026-05-24 (close) | Mic sync engagement fix | Play auto-enables SR; ES toggle syncActive bug; vitest 144/144 |
| 2026-05-24 (close) | Mic device routing + SR track start | mic selector, label remap, `start(audioTrack)`; Play no auto-sync; vitest 157/157 |
| 2026-05-24 (close) | Verification hardening + log hygiene | fixed FE lint blockers; App route async assertions; test-mode `tp-sync` debug gating; FE lint/typecheck/tests green in container |

---

## Explicit unknowns

See `.work/plans/UNKNOWNS.md` — U9 resolved (M7 LAN + multi-QR). U1/U6/U8 closed M6.

---

## Last verification (2026-05-24 close)

```
npm run lint          → exit 0 (frontend container)
npm run typecheck     → exit 0 (frontend container)
npm test -- --run     → 157/157 (frontend container)
```

**Device manual check:** adaptive mic sync (heyday + `sr.startInstance mode:track`) + bottom clearance + horizontal scroll — **not verified** (owner).

---

## Cross-LLM verification

- **M5-T9:** pairing security paths — done
- **M6-T6:** markdown-render + ADR 005 — done (MOD-06 M6 review doc)
- **M7-T9:** LAN + multi-QR handoff — done (MOD-06 M7 review doc)
- **M8-T11:** adaptive teleprompter — **re-shipped** 2026-05-24 (speech sync); interim removal `95f804e` superseded

### UI layer (UI Design OS)

- **Framework:** `.ai.ui/` (sibling to `.ai/`)
- **UI handoff:** `.work.ui/context/HANDOFF_UI.md`
- **UI next:** `.work.ui/plans/NEXT_UI.md`
- **Status:** **S1–S5 complete** 2026-05-23 · **ui-implementation-ready: yes**
- **Next UI:** Production deploy (Agent OS track) · optional UIS-06 record
