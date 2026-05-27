# Adaptive re-lock rounds 4–10 — retrospective (all reverted)

**Date:** 2026-05-26 (afternoon → late evening)
**Baseline:** `33234b1` (round-3 viewport-anchored re-lock, on `main`)
**Outcome:** Owner rolled back **everything** through round 10. None of the attempts produced acceptable mobile UX. Working tree returned to baseline `33234b1`.
**Tests at every rollback point:** `npm test` 193/193, `npm run lint` exit 0, `npm run typecheck` exit 0 — failures are behavioral on device, not in the test suite.

This file exists so the next session can re-attempt without re-walking the same dead ends.

---

## What we tried (in order) and why each failed

### Attempt R4 — IntersectionObserver paragraph constraint + compound split + head-first re-lock + mobile SR dedup

**Hypothesis:** matcher was searching a too-wide window after silence; constraining to the visible paragraph would land re-lock precisely.

**Changes:**
- New `useVisibleWordRange` hook (IntersectionObserver) + `annotateBlockWordRanges`
- Compound-word split (`tools-teleprompt` → `tools`+`teleprompt`)
- Head-first re-lock (try earliest buffered words before tail)
- `speechResultUtils.ts`: mobile detection, confidence filter for Android fake-finals, prefix-extension dedup
- Cursor catch-up at stage-2 arm
- `onspeechstart` snap-to-viewport (instant feedback during re-lock)
- Proximity-weighted scoring in matcher
- Post-relock advance step cap (2 steps for 1.5s)

**Owner feedback:** "still clunky, doubtful, after long pause jumps to wrong lines, feels insecure"

**Verdict:** matcher improvements were sound but **the snap was happening before SR had any data and was based on a viewport that had drifted**. None of the constraint/dedup work addressed the actual cause.

---

### Attempt R5 — Stricter matcher thresholds + stricter snap gate + cooldown extension

**Hypothesis:** matcher accepted borderline matches → wrong-line jumps.

**Changes:**
- `MIN_RELOCK_MATCH` 4 → 5, `MIN_RELOCK_DISTINCTIVE` 3 → 4
- Proximity decay `/20` → `/14`
- `VISIBLE_PARAGRAPH_BUFFER` 60 → 25
- `SPEECH_START_SNAP_MIN_GAP` 0 → 12 (require gap before snapping)
- `RELOCK_COOLDOWN_MS` 2.0s → 2.5s, also applied to silence-trigger
- Post-relock advance cap 2→1 step for 2.5s

**Owner feedback:** "FUCK YOU!! NOW it just doesn't detect any lines after big pause"

**Verdict:** raised matcher floor so high that legitimate short post-pause utterances ("ok así") couldn't pass → matcher returned null → escape path didn't restore `readingWordIndex` → mark stayed invisible. Symptom = "doesn't detect any lines".

---

### Attempt R6 — Disable drift re-lock + extend silence trigger to 6s

**Hypothesis:** wobble loop = drift re-lock firing repeatedly on mobile SR garbles.

**Changes:**
- Drift re-lock **disabled** (`SILENT_DRIFT_NULL_TICKS` → `DRIFT_NULL_TICKS_LOG_ONLY`, log only, no trigger)
- `RELOCK_ARM_TIMEOUT_MS` 4s → 6s
- `SPEECH_START_SNAP_MIN_GAP` 12 → 20
- Matcher floor reverted to 4/3 (R5 was overcorrection)
- Proximity decay `/14` → `/16`
- Added test: 4-word distinctive run passes the new floor

**Owner feedback:** "now it's worse, totally stuck right now, i'm not speaking and it just stays still"

**Verdict:** I "fixed" the mark-invisible bug from R5 by restoring `readingWordIndex` in escape/defer paths. But `readingWordIndex` is a **dual-purpose signal**: visible mark AND scroll control. When I set it, `useSyncScroll` entered track mode and held the scroll at that stale position — "stuck". Reverted the mark-restore in escape/defer paths.

---

### Attempt R7 — Disable skip-ahead in post-relock window

**Hypothesis:** "Line #1 → Line #3, skip Line #2" was the matcher's internal skip-ahead path returning a far match.

**Changes:**
- Added `AdvanceOptions.disableSkipAhead` to `advanceFromCursor` / `advanceRepeatedlyFromCursor`
- During `POST_RELOCK_ADVANCE_RESTRAINT_MS` (2.5s), `disableSkipAhead: true` so the matcher can only return matches within `cursor + MAX_FORWARD_WORD_JUMP` (~18 words)
- Test: `disableSkipAhead` caps the result to the sequential window

**Owner feedback:** "similar shit, skipped a couple of lines"

**Verdict:** wasn't the cause. The user's "skipped lines" was happening in re-lock landing itself, not in post-relock advance.

---

### Attempt R8 — Freeze scroll during stage-2 silence

**Hypothesis (probably the right diagnosis at last):** lever-speed scroll runs during silence (mark cleared at 1.75s) → during a 6s pause, viewport drifts forward 3–4 lines → cursor catch-up at stage-2 anchors to the drifted viewport, not where the user actually is → user feels "skipped lines".

**Changes:**
- `useSpeechTracker` exposes new `scrollFrozen: boolean` state
- Set true at stage-2 arm, false on `onspeechstart` snap, successful match, escape, and at every `armSilenceTimer` call
- `useSyncScroll` accepts `scrollFrozen?: boolean`; lever-branch holds `scrollTop` when true
- `Player.tsx` wires through; `player.test.tsx` mock updated

**Owner feedback (after eventual device test, R9):** "when I went silent it continued scrolling down but it stopped in the middle of the scroll, now, the readable text has not been reached"

**Verdict:** Wrong direction — and the previous retrospective's endorsement of this as "probably the right fix" was incorrect. At 1× lever, 6s of silence drifts ~7–9 lines before the freeze even fires. By the time the script halts, the user's reading line is already off-screen. Worse, owner's intended use case includes deliberately pausing to let metadata scroll past — any freeze during silence actively breaks that workflow. **This was the seed of all R9 failures below.**

---

### Attempt R9 — Earlier scroll freeze (2500 ms intermediate timer)

**Hypothesis:** R8's freeze fires too late (6s); a 2.5s freeze keeps drift under ~2 lines while still tolerating natural breath/sentence pauses.

**Changes:**
- New `SCROLL_FREEZE_TIMEOUT_MS = 2500` and `scrollFreezeTimerRef`
- Fires `setScrollFrozen(true)` independently of stage-2 re-lock arm
- Released on any SR result (interim or final), `onspeechstart` snap, successful match, escape

**Owner feedback:** "WHY AFTER THE LONG PAUSE, WHY DOES THE APP JUST DOESN'T DO WHAT IT DID AT THE BEGINNING WHEN I STARTED READING FOR THE FIRST TIME AND LINE LOCATION WORKED FINE.... I MADE A PAUSE TO LET META TEXT SCROLL THROUGH, AND THEN I RESUME READING, AND THE DAMN APP DOESN'T PICK UP, AND LOCATE LINES PROPERLY AS IT DID AT THE BEGINNING?"

**Verdict:** The scroll freeze itself was wrong-direction — it actively prevents the owner's "let meta scroll through" workflow. Worse, it didn't address the actual complaint (which was about matcher behavior on resume, not scroll position). The freeze was treating a downstream symptom of the matcher being too strict. **The previous retrospective's diagnosis ("freeze the scroll during long silence") was wrong; the real bug is in the re-lock matcher's acceptance criteria.**

---

### Attempt R10 — Permissive global re-lock (`findGlobalLock`) + remove all freeze

**Hypothesis:** Initial-lock works at startup because it's permissive (`MIN_INITIAL_LOCK_RUN = 3`, no distinctive minimum, no backward-gap reject, no constraint). Re-lock after silence is brittle because it stacks defer (5 words) + 4/3 thresholds + visible-paragraph constraint + backward rejection + 5-tick fallback also gated. After a long pause the user is effectively at "fresh start" — re-lock should mirror initial-lock behavior.

**Changes:**
- New `findGlobalLock(spoken, scriptWords, biasIndex)` in `matchScriptWords.ts`: same strict 3-word run as `findInitialLock`, full-script search, tie-break by `(matchedWords desc, distance to viewport asc)`
- `useSpeechTracker` silence-trigger branch: defers on < 3 words (was 5/4); calls `findGlobalLock` first; falls back to `findInitialLock` once; **drops** `shouldAcceptRelockMatch` backward-gap reject; **drops** visible-paragraph constraint
- Drift-trigger branch kept strict (paragraph-constrained, 4/3, anti-wobble) — only relevant if drift re-lock is ever re-enabled
- **Removed entirely:** `scrollFrozen` state, the 2.5s freeze timer, R8's stage-2 freeze, and all wiring through `useSyncScroll` / `Player.tsx` / tests. Lever scroll runs unimpeded during silence (matches owner's meta-scroll workflow).

**Owner feedback:** "FUCK YOU! SAME FUCKING SHIT, WHEN I RESUME READING, IT SKIPS LINES, FUCKING IDIOTIC."

**Verdict:** The 3-word permissive criterion **is too forgiving** for languages with high function-word repetition (Spanish). With proximity tie-break, the matcher reliably lands the cursor on a similar 3-word fragment that occurs 1–2 lines past the user's actual reading position — exactly the "skipped lines" symptom from R7. The matcher's strict 4/3 floor (round 3 baseline) was not over-engineering; it was the **disambiguation budget** Spanish content needs. Lowering it without alternative disambiguation (e.g. paragraph constraint, or reading-rate gating) reproduces the R7 failure.

The R10 architectural premise — "treat re-lock like initial lock" — is wrong because:
1. Initial lock benefits from "earliest in script" tie-break (no other reasonable answer when the user has just started). Re-lock has no comparable signal once you remove cursor-proximity and viewport constraint.
2. A 3-word match is unique enough in the **first 250 words** of most scripts (where `findInitialLock` searches), but **not** unique across the whole script — especially in Spanish.

---

## Files touched (all uncommitted at rollback)

```
M  frontend/src/prompter/Player.tsx
M  frontend/src/prompter/adaptive/annotateScriptWords.ts
M  frontend/src/prompter/adaptive/matchScriptWords.ts
M  frontend/src/prompter/adaptive/useSpeechTracker.ts
M  frontend/src/prompter/adaptive/useSyncScroll.ts
M  frontend/tests/adaptive/annotateScriptWords.test.ts
M  frontend/tests/adaptive/matchScriptWords.test.ts
M  frontend/tests/player.test.tsx
A  frontend/src/prompter/adaptive/speechResultUtils.ts
A  frontend/src/prompter/adaptive/useVisibleWordRange.ts
A  frontend/tests/adaptive/speechResultUtils.test.ts
A  frontend/tests/adaptive/useVisibleWordRange.test.ts
```

Diff stat at rollback:
```
8 files changed, 636 insertions(+), 123 deletions(-)
+ 4 new files
```

---

## What the next attempt should KEEP from this work

Even though rolling back, these ideas were sound and worth re-introducing **independently** in small commits next time:

1. **Mobile SR dedup (`speechResultUtils.ts` from R4)** — Android Chrome bug filter is well-documented (confidence > 0 check; prefix dedup). Standalone utility, low risk. **Not yet device-validated** but architecturally clean.
2. **Compound word split** — improves matcher accuracy on URLs / hyphenated terms; trivial change.
3. **`annotateBlockWordRanges` + `useVisibleWordRange`** — useful for paragraph-aware features beyond re-lock; trivial overhead.
4. **`disableSkipAhead` option on `advanceFromCursor`** — even if not used post-relock, it's a clean option for future strict-mode advance.

---

## What the next attempt should DROP

1. **Drift re-lock** — kept producing wobble loops. The "safety net" was the failure mode. Disable or eliminate.
2. **`onspeechstart` instant snap** — was the source of "feels insecure" jitter. Let the matcher decide via the first SR result. Visual feedback via mark restoration is acceptable but careful with the dual-purpose `readingWordIndex` (see below).
3. **Raising matcher thresholds** — 4/3 is the working floor. Higher starves the matcher. Don't try this again without first proving the matcher is genuinely accepting wrong matches.
4. **Lowering matcher thresholds (R10 lesson, NEW)** — Going below 4/3 to 3/0 on Spanish content reliably lands on similar text 1–2 lines past the user. The strict floor is the disambiguation budget. Do not go below 4/3 without an external disambiguation signal.
5. **Restoring `readingWordIndex` in failure paths to "show the user where we are"** — this freezes the scroll. The mark and the scroll-target are coupled; modifying one always affects the other.
6. **Scroll freeze during silence (R8/R9 lesson, NEW)** — Actively breaks the owner's "let meta scroll through" workflow and never addressed the real complaint. Lever scroll must keep running through silence.

---

## Architectural lessons (do not lose)

### Lesson 1: `readingWordIndex` is a dual-purpose signal

| Value | Visual effect | Scroll effect |
|---|---|---|
| `null` | No line highlighted | Scroll uses **lever speed** |
| `number` | Line containing word is highlighted | Scroll **tracks** that line at 50% center |

Any code that sets `readingWordIndex` is implicitly changing the scroll mode. If you want to "show a mark without scrolling", you need a **second signal** (like the `scrollFrozen` flag) — don't conflate them.

### Lesson 2: Lever scroll during silence is the hidden enemy — but freezing it is also wrong

When the mark is null, scroll runs at user-chosen lever speed. During any silence longer than ~3 seconds at typical speeds, the viewport drifts past the paragraph the user is reading. Any algorithm that uses "viewport position == user position" after a silence is **wrong by ~3 lines**.

The previous version of this retrospective recommended freezing the scroll during long silence. **R9 disproved that direction** on device:

- Owner's workflow includes deliberately pausing to let metadata scroll through. A freeze breaks this — the script halts in the metadata block before the post-meta content scrolls into view.
- Even with the freeze, the matcher still failed to re-acquire on resume. So freezing scroll **was treating a downstream symptom**, not the root cause.

The correct framing: **stop using viewport as a proxy for user reading position when the user has paused.** Don't freeze the scroll — change what the matcher trusts. Concretely, the viewport anchor is a useful tie-break ONLY when there is no cursor-proximity signal; once the cursor is calibrated and known, treat it as the primary anchor and let the viewport hint at "user may have moved" only when forward-progress evidence accumulates.

### Lesson 3: Mobile Web Speech API is fundamentally unreliable

- Android Chrome marks interim as final with `confidence === 0`
- Duplicate / prefix-extension final transcripts
- Hard 60s session cap with mandatory restart
- Predictive interim (emits words user hasn't said yet)

No amount of matcher tuning makes this perfect. Production teleprompters (GetAutoCue etc.) use **streaming ASR** (AssemblyAI, Deepgram). If owner ever wants production-grade reliability, that's the path.

### Lesson 4: The matcher cannot beat user-spoken ambiguity (UPDATED with R10 evidence)

In Spanish (and similar languages) function-word collisions across paragraphs are constant: "el sistema", "para que", "en la práctica con". Even with paragraph constraint, a 4-word match can be ambiguous between 2–3 places.

**R10 confirmed:** lowering the matcher floor from 4/3 to 3/0 (the `findInitialLock` criterion) reliably lands the cursor on a 3-word fragment that occurs 1–2 lines past the user's actual reading position. The strict 4/3 floor is **not** over-engineering — it is the disambiguation budget that Spanish content requires. Removing it without an alternative disambiguation signal reproduces the R7 "skipped lines" symptom exactly.

The genuine disambiguators are:
- **Strong proximity bias** (kept in baseline)
- **Tight visible-paragraph constraint** (kept in baseline at ±25)
- **Strict 4/3 word floor** (now confirmed mandatory; kept in baseline)
- **Knowing where the user actually is** (the unsolved part — and freezing the scroll did not help)

### Lesson 5: Don't chain multiple "fixes" without testing each

R5 made FOUR changes at once. When the user said "doesn't detect lines", it took two more turns to untangle which change caused which symptom. Always isolate.

R10 made TWO architectural changes at once (scroll-freeze removal + matcher permissiveness). When the user said "skips lines", we don't know whether the regression was the matcher floor (most likely) or the freeze removal (possible). The retrospective tags it as the matcher because R7 showed the same symptom from the same direction, but **strictly we did not isolate.** Future attempts must isolate.

### Lesson 6 (NEW, R8–R10): Architectural premises endorsed by a previous retrospective are not facts

The R4–R6 retrospective ended with "scroll freeze during stage-2 silence is almost certainly the correct fix" and "freeze the scroll during long silence, leave the matcher alone." Both of those claims, when finally device-tested in R8/R9, were **wrong**. They were untested hypotheses written down with confidence and then carried forward as if proven.

Future retrospectives must distinguish between:
- **Verified by device test** (e.g. R5: "raised matcher floor → matcher starved")
- **Hypothesis at time of writing** (e.g. R8: "freeze probably the right fix")

Do not let an unverified hypothesis from a prior retrospective set the direction for the next session without explicitly re-checking it.

---

## Recommended approach for the next attempt

The **R8/R9 scroll-freeze direction is no longer the recommendation.** The R10 permissive-matcher direction is also dead. Both have been device-tested and rejected.

What's left is **incremental work on top of the round-3 baseline (`33234b1`)** — keep its 4/3 floor, paragraph constraint, anti-wobble guard, and lever-scroll-during-silence; pursue independent improvements that do not touch the matcher's acceptance criteria or the scroll mode.

Go in **strict order**, **one commit per change**, **device-test between each**:

1. **Commit 1: mobile SR dedup** (from R4)
   - Standalone `speechResultUtils.ts` — Android Chrome confidence-zero filter + prefix dedup
   - Test: read continuously → no duplicate words in `sr.heard` debug log
   - Low risk; fixes Android Chrome quirk regardless of matcher behavior

2. **Commit 2: compound word split** (from R4)
   - Trivial annotation change for hyphenated tokens
   - Test: script with URLs / hyphens → matcher works through them

3. **Commit 3 (optional): IntersectionObserver paragraph hints** (from R4)
   - `useVisibleWordRange` + `annotateBlockWordRanges` as **observability only** in v1 — log `sync.viewportRange` so we can correlate device behavior with what the IntersectionObserver actually reports
   - Do **not** wire it into matcher constraints in this commit
   - This gives ground truth before any further matcher change

4. **Commit 4 (only after 1–3 device-validated): consider whether to re-shape the silence-trigger matcher**
   - Possible direction: keep 4/3 floor, but on silence trigger run **both** the anchored search AND a global search; accept the anchored result if it qualifies, fall back to global only when anchored returns null. This preserves disambiguation while adding a recovery path. **This is a hypothesis, not a recommendation.** Verify it does not regress R7 / R10.

Do **NOT** combine these into a single round. Do **NOT** modify matcher thresholds (4/3 floor is the disambiguation budget). Do **NOT** add the `onspeechstart` instant snap. Do **NOT** add a scroll freeze. Do **NOT** lower the spoken-words defer threshold below 5 (4 with paragraph constraint).

---

## Final state of constants worth knowing

These are the values in the **working baseline** (`33234b1`, round-3) — what's running on `main` after every R4–R10 rollback:

```ts
SILENCE_MARK_CLEAR_MS = 1750
RELOCK_ARM_TIMEOUT_MS = 4000
MIN_RELOCK_MATCH = 4
MIN_RELOCK_DISTINCTIVE = 3
RELOCK_BACKWARD_VIEWPORT_GAP = 20
RELOCK_DRIFT_BACKWARD_VIEWPORT_GAP = 5
MAX_RELOCK_FALLBACK_TICKS = 5
SILENT_DRIFT_NULL_TICKS = 10    ← drift re-lock active in baseline
MIN_RELOCK_SPOKEN_WORDS = 5
RELOCK_COOLDOWN_MS = 2000       ← only suppressed drift, not silence
```

---

## Bottom line (UPDATED 2026-05-26 late)

The round-3 baseline (`33234b1`) on `main` is the **best version produced so far** for the resume-after-pause path. It is not perfect — owner reports residual "skipped lines" on long-pause-then-resume — but every alternative attempted in R4–R10 made it strictly worse on device.

The genuine residual problem is most likely a fundamental **mobile Web Speech API limitation** combined with **Spanish function-word ambiguity** (Lessons 3 and 4). Production-grade reliability for this use case probably requires moving to a streaming ASR provider (AssemblyAI, Deepgram, etc.); pure browser SR may have hit its ceiling for Spanish content on mobile Chrome.

**Single-line summary for next session:** *do not touch matcher thresholds, do not add scroll freezes, do not chase architectural rewrites. The remaining incremental wins are mobile SR dedup, compound split, and observability for IntersectionObserver — in that order, isolated, device-tested between each. After that, the realistic path to better resume-after-pause is changing ASR provider, not retuning this matcher.*
