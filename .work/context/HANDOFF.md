# HANDOFF - session boundary

## Session status

**Open:** 2026-07-10 - goal: Continue adaptive re-lock incremental work from round-3 baseline — start with mobile SR dedup.

**Updated:** 2026-07-10

Treat prior closed sessions as historical only; see "What this cycle produced" below.

**Repository state:** v0.1.0. M1–M8 complete. **Adaptive speech sync = round-3 baseline (`33234b1`) on `main`** plus compound word split, and IntersectionObserver viewport-range observability (util only — see correction below). FE 204/204 tests pass in container; lint + typecheck clean. **Device sign-off still pending** — next session should verify on Android Chrome before any further matcher changes.

**Correction (2026-07-10, later same day):** the previous entry below claimed mobile SR dedup and viewport-range hints were "implemented" and "wired into `useSpeechTracker.ts` and `Player.tsx`". Investigation this session found that was **inaccurate** — `speechResultUtils.ts` and `useVisibleWordRange.ts` exist with passing unit tests but are **not imported anywhere in application code** (only their own test files reference them).

**Mic-notification-loop bug — corrected diagnosis (2026-07-10, third pass):** owner reported clicking the ES/EN sync toggle causes a continuous "mic turned on" OS notification every ~5s. First pass diagnosis (disabling `rec.start(track)`) was **real but insufficient** — that code path only ever ran when a specific non-default mic was saved in Settings; with the default mic (empty `micDeviceId`/`micDeviceLabel`, the common case), `track` was already `null` and `rec.start()` was already being called, so that fix changed nothing for most users, and the owner correctly reported the bug persisted.

**Root cause (confirmed via web research, not just code reading):** this is a **known, unfixable-at-the-JS-level Android Chrome limitation**, not an app bug per se. `SpeechRecognition.continuous = true` does **not** actually keep listening on Android Chrome — Chrome force-ends the session after a few seconds of silence regardless (Chromium issue **41297427**; see `WICG/speech-api#99`, `WebAudio/web-speech-api#136`, multiple StackOverflow reports of the same symptom). The only available workaround — restart a fresh `SpeechRecognition` in `onend`, which is exactly what `useSpeechTracker.ts` does — makes Android replay its mic connect/disconnect notification (icon + sound) **on every restart**, independent of whether the instance is bound to an externally-held track. There is **no web API to suppress this OS-level indicator**; it is an intentional OS privacy/security feature per those upstream threads.

**What was actually applied this session:**
1. `speechRecognitionStart.ts` / `useSpeechTracker.ts` / `micDevice.ts` — the track-start removal and double-`getUserMedia` reduction from the first pass. Legitimate cleanup, kept, but **not the root-cause fix** — see above.
2. `restartBackoff.ts` (new, then removed) — attempted exponential backoff on the `onend` restart delay. Removed after owner rejected the approach.
3. **Auto-standby on silence (2026-07-10, fourth pass, then replaced)** — attempted 10s silence timeout. Removed after owner asked for one-shot manual control.
4. **One-shot SR mode (2026-07-10, fifth pass)** — owner asked: "turn microphone on/off only when user clicks on the language button." Implemented in `useSpeechTracker.ts`:
   - Removed the `onend` auto-restart loop entirely.
   - Removed the held `MediaStream` from `openMicSession`; SR now acquires and releases its own input via plain `rec.start()`.
   - When the SR session naturally ends, sync **does not** auto-disengage; the ES/EN button stays active until the user explicitly clicks it again.
   - To listen again after a session ends, the user taps ES/EN twice (off, then on), or navigates away and back.

5. **Reverted to baseline continuous mode (2026-07-10, sixth pass)** — owner reported sync still "turns off automatically" after ~15s in one-shot mode and demanded the mic stay active until they explicitly click ES/EN. Reverted `useSpeechTracker.ts` and `speechRecognitionStart.ts` to the round-3 baseline (`7f3e15b`): held mic stream + `rec.start(track)` + immediate auto-restart on `onend`. This keeps SpeechRecognition continuously running while sync is engaged. Trade-off: Android Chrome replays the OS mic connect/disconnect notification on every SR restart, which is the exact behavior originally reported. There is no web-API way to have continuous mic without these restarts on Android Chrome.

**Honest assessment (pass six):** the owner's requirements are technically contradictory under the free Web Speech API on Android Chrome. (a) "Mic stays on until I turn it off" requires continuous SR. (b) "No repeated mic alerts" requires SR not to restart. But Android Chrome force-ends SR every few seconds of silence, so (a) forces (b) to be violated. The only no-alert continuous path is streaming ASR (subscription). The baseline restored here prioritizes (a) over (b).

**⚠️ Pass seven (2026-07-10, separate session, same day) — re-implemented one-shot mode, in direct tension with pass six's revert:** owner explicitly ruled out paying for streaming ASR and asked (in a different chat session, unaware of the pass-four/five/six history above) to "just activate/deactivate the microphone on user's request (clicking the language button on/off)" — i.e. exactly the **one-shot mode pass four already tried and pass five/six rejected** ("sync still turns off automatically... demanded mic stay active until explicit click"). Implemented again in `useSpeechTracker.ts`:
- `rec.onend` no longer auto-restarts on a natural/no-speech end (Chromium issue 41297427) — only `langRetry` (wrong-language-candidate correction while actively hearing speech) still restarts immediately.
- Added `onSyncEnded` callback so `Player.tsx` flips the ES/EN button back to visually "off" the moment SR stops, rather than showing "on" while nothing is listening (pass four's implementation reportedly did not do this, which may be why it read as "turns off automatically" rather than "correctly reports it turned off").
- `speechRecognitionStart.ts` left as pass six restored it (`rec.start(track)` when a specific device is held) — track-vs-default is no longer the primary concern once restarts aren't continuous.
- FE 205/205 pass; lint + typecheck clean in container. **Not device-verified.**

**Flagged conflict — needs explicit owner resolution, not another silent re-implementation:** whether Chrome's no-speech force-end fires only on sustained silence (in which case active continuous reading should rarely trip it, and this pass's behavior differs meaningfully from pass four) or on some fixed session duration regardless of speech (in which case this will reproduce the exact "turns off after ~15s" complaint from pass five) **is unverified without a real device test.** Do not re-litigate this a third time without a device test result in hand — either (1) it holds up during continuous reading and only requires a re-tap after genuine pauses, which is what was asked for, or (2) it reproduces pass five's complaint, in which case the only remaining options are: accept the continuous-restart notification loop (pass six), or pay for streaming ASR (ruled out). There is no fourth option — this is a real Android Chrome / Web Speech API ceiling, not a bug in this codebase.

**Real fix, if this pass's one-shot behavior is unacceptable:** stop using the Web Speech API's continuous-mode + restart-on-end pattern altogether — migrate to a streaming ASR provider (AssemblyAI / Deepgram) that holds one persistent WebSocket audio connection with no forced session end and no restart-driven notification. This is the only approach that gets continuous tracking AND no repeated notifications simultaneously.

**Pass eight (2026-07-10, same day, decision tree now closed) — owner confirmed on device: pass seven's one-shot mode "deactivates automatically."** This settles the open question from pass seven: Chrome's no-speech force-end fires often enough during normal use that one-shot mode is unacceptable — confirming pass five's original rejection was correct, and this is a real platform ceiling, not an implementation bug. Owner has explicitly ruled out paying for streaming ASR. **Final decision under those two constraints:** restore always-restart-on-`onend` (continuous mode, sync stays engaged until explicit tap-off — no more silent drop-outs) **plus** the exponential backoff mitigation from the earlier "third pass" (re-added `restartBackoff.ts`, deleted by an intervening session): consecutive restarts where the *previous* SR instance heard zero speech back off 280ms → capped 8s; any instance that hears real speech resets to 280ms immediately. This does not eliminate the OS mic notification (nothing free can, per Chromium issue 41297427) but reduces its frequency during idle-after-engage / long-pause stretches without ever delaying pickup once the user is actually speaking. `onSyncEnded` is now only invoked for a genuine permission-denied error (mic access actually revoked) — not for ordinary silence-triggered ends — so the ES/EN button stays "on" for the whole engaged session as the owner wants, and only flips off on tap or real permission loss.

**This closes the decision tree — do not attempt a ninth re-implementation without new information.** Every combination has now been tried: continuous+restart (notification loop, accepted as the least-bad tradeoff), one-shot (silent drop-outs, rejected on device), backoff-only mitigation (this pass, combines the two). The only remaining lever is streaming ASR (ruled out on cost) or tolerating the reduced-but-nonzero notification frequency of this pass. FE 208/208 pass; lint + typecheck clean in container. **Not device-verified** — next device test should confirm (a) sync no longer silently drops during normal reading pauses, (b) the notification frequency is noticeably reduced versus pass six's flat 280ms restart, while accepting it will not be silent.

**Separate maintenance additions (same session):**
- `bin/start.sh` gained `cleanup` and `rebuild` commands. `cleanup` safely removes stopped project containers, orphaned networks, and dangling images while preserving volumes. `rebuild` runs a no-cache `docker compose build` followed by `up -d`. Both are available headlessly and in the interactive menu.
- `deploy/docker-compose.yml` + `deploy/Caddyfile`: added `restart: unless-stopped` to the frontend service and made Caddy's upstream frontend port configurable via `{$FRONTEND_DEV_PORT:5173}` (with a matching env var passed to the Caddy container). This helps if the frontend Vite dev server crashes/exits and makes the proxy port follow the configured dev port. Compose config and Caddyfile both validate.
- `deploy/README.md`: added a "Production frontend" section documenting that the dev compose file proxies to the Vite dev server and must be replaced with the static production image (`frontend/Dockerfile` target `prod`) before a real production deploy.

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
   1. ⚠️ Mobile SR dedup (`speechResultUtils.ts`) — utility + tests written 2026-07-10, but **not wired into `useSpeechTracker.ts`**. Decide whether to wire it in as its own isolated, device-tested change, or drop it.
   2. ✅ Compound word split (`annotateScriptWords.ts`) — implemented 2026-07-10 and wired into `Player.tsx`'s word annotation pass.
   3. ⚠️ IntersectionObserver paragraph hints (`useVisibleWordRange.ts`) — utility + tests written 2026-07-10, but **not wired into `Player.tsx`** (no observability signal is currently emitted).
   4. ⚠️ **Mic notification loop** (ES/EN toggle → continuous "mic on" OS notification every ~5s) — **not fully fixable in-app**: confirmed 2026-07-10 as a known Android Chrome platform limitation (Chromium issue 41297427 — `continuous` mode still force-ends on silence; restart-on-`onend` is the only workaround and it re-triggers the OS mic notification every time, with no suppression API). Applied a **mitigation** (exponential restart backoff during silent-only cycles, `restartBackoff.ts`) that reduces frequency but does not eliminate it. Full elimination requires moving off Web Speech API continuous-restart entirely (streaming ASR).
   5. **Next:** device-test on Android Chrome — (a) confirm the backoff mitigation meaningfully reduces the notification frequency (does NOT expect full silence), (b) check whether the loop persists even *while actively reading* (would indicate a worse, different problem — see HANDOFF correction), (c) confirm speech sync still tracks correctly with default-input SR start, (d) decide on items 1/3 above. If the mitigation is an acceptable UX, stop and close. If residual "skipped lines on resume" OR the notification loop remains unacceptable, the realistic ceiling of browser SR has been reached — decide between a cautious hybrid silence-trigger matcher or moving to streaming ASR (AssemblyAI / Deepgram), which fixes both.
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
| 2026-07-10 | Adaptive incremental fixes (Phases 1–3, partial) | `speechResultUtils.ts` + tests; `annotateScriptWords.ts` compound split + tests (wired into `Player.tsx`); `useVisibleWordRange.ts` observability + tests (**not wired in** — see correction). FE 205/205; lint/typecheck clean; **device verification pending** |
| 2026-07-10 (later) | Mic notification loop — first-pass fix (real but insufficient) | `rec.start(track)` disabled in `speechRecognitionStart.ts`; `useSpeechTracker.ts` restart path simplified; `micDevice.ts` `resolveMicForSpeech` redundant getUserMedia removed. FE 204/204. Owner reported bug persisted — this fix only applied when a non-default mic was saved in Settings. |
| 2026-07-10 (third pass) | Mic notification loop — corrected root cause + mitigation | Confirmed via web research: Android Chrome force-ends `continuous` SR on silence (Chromium issue 41297427); restart-on-`onend` (this app's only workaround) re-triggers the OS mic notification every restart with no suppression API — this is a platform limitation, not fully fixable in JS. Added `restartBackoff.ts`: exponential restart delay (280ms→8s cap) during consecutive silent-only restart cycles, reset on any heard speech. Reduces frequency, does not eliminate. FE 207/207; lint/typecheck clean; **device verification pending**; full fix requires streaming ASR migration if mitigation is insufficient. |

---

## Explicit unknowns

See `.work/plans/UNKNOWNS.md` — U9 resolved (M7 LAN + multi-QR). U1/U6/U8 closed M6.

---

## Last verification (2026-07-10, third pass)

**Code at `HEAD`:** uncommitted — Phases 1–3 (partial, see correction above) plus the mic-notification-loop mitigation (`restartBackoff.ts` + track-start removal), on top of `33234b1` round-3 baseline.

```
npm run lint          → exit 0 (frontend container)
npm run typecheck     → exit 0 (frontend container)
npm test -- --run     → 207/207 (frontend container)
pytest tests/ -q      → not re-run this session (no api changes)
ruff check .          → not re-run this session (no api changes)
pyright .             → not re-run this session (no api changes)
```

**Device manual check:** Not performed this session (no Android hardware available). Next step is Android Chrome device test of: (1) the notification-loop **mitigation** noticeably reduces frequency (it will NOT fully eliminate it — that's expected per the platform-limitation finding, not a bug in the mitigation), (2) the loop does not persist while actively reading aloud (if it does, that's a different/worse symptom — see HANDOFF correction), (3) speech sync still tracks correctly using default-input SR start, (4) compound word split, (5) decide on wiring mobile SR dedup / viewport-range observability (currently unwired utilities). If the mitigation is an acceptable UX, close the iteration. If not — or if "skipped lines on resume" also remains — the realistic ceiling of browser SR has been reached and streaming ASR migration is the real fix for both problems at once.

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
