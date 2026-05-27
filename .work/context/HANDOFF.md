# HANDOFF - session boundary

## Session status

**Closed:** 2026-05-26 (late) — adaptive re-lock rounds R8–R10 attempted on top of baseline `33234b1` (R8 stage-2 scroll-freeze, R9 2.5s scroll-freeze timer, R10 permissive `findGlobalLock` + scroll-freeze removal). **All reverted** by owner after device tests reproduced the same "skipped lines on resume" symptom that R7 produced. Working tree returned to baseline `33234b1`. Untracked retrospective `20260526-adaptive-relock-r4-r6-retrospective.md` updated to cover R4–R10 — keep this file; it is the canonical record of dead ends.

**Updated:** 2026-05-26 (late)

**Repository state:** v0.1.0. M1–M8 complete. **Adaptive speech sync = round-3 baseline (`33234b1`) on `main`** — no behavioral change committed this session. FE 179/179 baseline tests pass in container; experimental branches reached 193/193 before each rollback. **Device sign-off still pending** and is now believed to require either the incremental work in the retrospective's "Recommended approach" or a switch to streaming ASR (not browser SR).

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

> **Read first:** [`20260526-adaptive-relock-r4-r6-retrospective.md`](./20260526-adaptive-relock-r4-r6-retrospective.md) — full record of rounds **4–10** (2026-05-26 afternoon → late evening), all rolled back. Updated late on 2026-05-26 to cover R8–R10 device-test failures. Documents what was tried, what each owner-feedback verdict was, and the strict order for the next attempt.
>
> **Do NOT** re-attempt the dead-end directions: scroll-freeze during silence (R8/R9 disproven on device); permissive matcher floor below 4/3 (R10 disproven on device); raised matcher thresholds above 4/3 (R5 disproven); `onspeechstart` instant snap (R4 disproven); restoring `readingWordIndex` in failure paths (R6 disproven).

1. `@session-control start`.
2. **Recommended next attempt order** — incremental, isolated, device-tested between each. See retrospective § "Recommended approach":
   1. Mobile SR dedup (`speechResultUtils.ts` from R4) — Android Chrome confidence-zero filter + prefix dedup.
   2. Compound word split (from R4).
   3. IntersectionObserver paragraph hints as **observability only** in v1 — log `sync.viewportRange`, do not wire into matcher constraints.
   4. Only after 1–3 are device-validated, consider a hybrid silence-trigger matcher (anchored first, global as null fallback) — explicitly verify it does not regress R7/R10.
3. **Realistic ceiling:** browser Web Speech API on mobile Chrome may not be reliable enough for Spanish content with long pauses. If incremental work above does not produce acceptable UX, the credible production path is **streaming ASR** (AssemblyAI / Deepgram) — not further matcher retuning. Retrospective Lesson 3.
4. **Manual verify player layout** — bottom slider 20–50%; no horizontal scrollbar.
5. Production deploy when owner ready (`deploy/README.md`) — speech-sync residual issues do not block other features.

---

## Gate snapshot

| Phase | Status |
|-------|--------|
| P0–P6 foundation | done |
| plan-master-ready | **yes** (2026-05-20) |
| Master plan | **Approved** v1.2 (`20260521-full-plan.md`) |
| Implementation-ready | **yes** |
| M1–M7 | **complete** 2026-05-21 |
| M8 adaptive teleprompter | **re-shipped** 2026-05-24 — speech sync + skip-ahead matcher (after interim removal `95f804e`); 2026-05-26 viewport-anchored re-lock + two-stage silence + anti-wobble + drift-aware backward gap + cooldown |

---

## Open owner actions

| # | Action |
|---|--------|
| 1 | Commit uncommitted M7 work (`@session-control close commit`) | **Done** 2026-05-21 |
| 2 | Hotspot: set `PUBLIC_ORIGIN` + `API_PUBLIC_BASE_URL` in `.env.dev`; restart stack (`bin/start.sh dev restart`) | **Done** 2026-05-21 (`.env.dev` local; docs in README) |
| 3 | Production: set `API_OTP_HMAC_SECRET`; confirm Caddy forwards client IP |
| 4 | Optional: Lighthouse PWA audit (W6) |
| 5 | Manual phone test on hotspot IP (LAN + multi-QR) — re-scan all multi-QR codes after deploy |
| 6 | Manual device check: bottom clearance + no horizontal scroll on play route | **Not verified** this session |
| 7 | Manual device check: adaptive mic sync (sequential read + metadata skip) | **Partial** — A1–A2 pass; A3 partial; A4 fail pre-tune; re-test after commit |
| 8 | **Mobile sign-off:** SR restart + silence resume + line tracking | **Partial** 2026-05-25 — silence ~1.75s; matcher/scroll tuned; A4 re-test pending |
| 9 | Mobile editor bottom nav (clipped Settings / broken tabs) | **Fixed** 2026-05-25 — short labels + flex shrink |
| 10 | **Mobile re-test:** adaptive re-lock (round-3 tuning) — quick re-acquisition + stable mark after metadata-scroll | **Tested 2026-05-26** — round-3 baseline still produces "skipped lines on resume" complaint; rounds 4–10 all reverted. See retrospective. |
| 11 | **Decision needed:** continue browser SR with incremental fixes per retrospective § "Recommended approach", OR move to streaming ASR provider (AssemblyAI / Deepgram). Retrospective Lesson 3 makes the case the matcher has hit its ceiling for Spanish content on mobile Chrome. | Pending owner |

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
| 2026-05-25 | Mobile speech sync fixes | SR fresh restart on `onend`; center scroll tuning; silence releases mark → lever scroll; vitest 165/165 |
| 2026-05-25 | session close commit push | Scroll perf (marked-line only); dark range track token; settings-changed event; UI sounds removed; FE 167/167 |
| 2026-05-25 | session close commit push | API Settings populate_by_name; test env isolation; origin regression tests; API 26/26 |
| 2026-05-25 | session close commit push | Mobile nav fix; adaptive silence/matcher/scroll tuning; partial device sign-off; FE 167/167 |
| 2026-05-26 | Adaptive re-lock rearchitect — round 1 | `findRelockAnchoredToIndex` (viewport-anchored, strict, distinctive-required, tie-break to nearest); `findViewportAnchorWordIndex`; tracker `awaitingRelock` + viewport-anchor callback wired through Player; FE 173/173 |
| 2026-05-26 | Adaptive re-lock — round 2 (wobble) | Two-stage silence (`SILENCE_MARK_CLEAR_MS=1750`, `RELOCK_ARM_TIMEOUT_MS=4000`); `shouldAcceptRelockMatch` anti-wobble gate (`RELOCK_BACKWARD_VIEWPORT_GAP=20`); silent-drift threshold 5→10; FE 179/179 |
| 2026-05-26 | Adaptive re-lock — round 3 (hesitation) | `MIN_RELOCK_MATCH` 3→4; `MIN_RELOCK_DISTINCTIVE` 2→3; `MIN_RELOCK_SPOKEN_WORDS=5` defer-gate; drift-vs-silence trigger with `RELOCK_DRIFT_BACKWARD_VIEWPORT_GAP=5`; `RELOCK_COOLDOWN_MS=2000` for drift-induced re-lock; FE 179/179 |
| 2026-05-26 | session close commit push | Adaptive re-lock rounds 1–3 + bookends on `main`; device re-test pending |
| 2026-05-26 (afternoon) | Adaptive re-lock — rounds 4–7 (attempted) | IntersectionObserver paragraph constraint, compound split, head-first re-lock, mobile SR dedup, stricter matcher thresholds, drift-relock disabled, post-relock skip-ahead disabled. **All reverted** — see retrospective. Working tree: never committed. |
| 2026-05-26 (evening) | Adaptive re-lock — round 8 (attempted) | Stage-2 scroll-freeze (`scrollFrozen` state through `useSyncScroll`/`Player`/tests). **Reverted** after device test in R9 reproduced "skipped lines" — see retrospective. |
| 2026-05-26 (late) | Adaptive re-lock — round 9 (attempted) | 2.5s `SCROLL_FREEZE_TIMEOUT_MS` independent of stage-2 re-lock arm. **Reverted** — owner reported workflow break (deliberate meta-scroll pauses cut short by freeze) and matcher still failed on resume. |
| 2026-05-26 (late) | Adaptive re-lock — round 10 (attempted) | New `findGlobalLock` permissive full-script matcher (3-word `findInitialLock`-grade criterion, viewport-biased tie-break) replacing `findRelockAnchoredToIndex` for silence-trigger; dropped backward-gap reject + paragraph constraint + 5-word defer on silence path; removed all `scrollFrozen` plumbing. FE 193/193 in container. **Reverted** — owner reported "skipped lines on resume" matching the R7 symptom; 3-word floor confirmed too permissive for Spanish content. |
| 2026-05-26 (late) | Session close — no commits | Working tree returned to baseline `33234b1`; only addition is updated retrospective at `.work/context/20260526-adaptive-relock-r4-r6-retrospective.md` and this HANDOFF update. |

---

## Explicit unknowns

See `.work/plans/UNKNOWNS.md` — U9 resolved (M7 LAN + multi-QR). U1/U6/U8 closed M6.

---

## Last verification (2026-05-26 late)

**Code at `HEAD`:** `c822a2c` (LICENSE typo, on top of `33234b1` round-3 baseline). No behavioral change committed this session.

**Experimental branches verified before each rollback** (R10 / late-evening branch was the last):

```
npm run lint          → exit 0 (frontend container)
npm run typecheck     → exit 0 (frontend container)
npm test -- --run     → 193/193 (frontend container)
pytest tests/ -q      → not re-run this session (no api changes)
ruff check .          → not re-run this session (no api changes)
pyright .             → not re-run this session (no api changes)
```

**Device manual check:** Round-3 baseline (`33234b1`) tested by owner during this session — residual "skipped lines on resume" persists. Rounds 8 (stage-2 scroll-freeze), 9 (2.5s scroll-freeze), and 10 (permissive `findGlobalLock` + freeze removal) tested on device and rejected by owner; all reverted. The retrospective documents what each attempt looked like, the owner-feedback verdict on each, and why it was wrong. Player bottom clearance — still not verified. Mobile editor nav — fixed (prior session).

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
