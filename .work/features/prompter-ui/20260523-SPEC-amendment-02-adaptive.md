# Prompter UI — SPEC Amendment 02 (adaptive teleprompter)

**Status:** Approved  
**Approved:** 2026-05-23 (M8-T1)  
**Amends:** `.work/features/prompter-ui/20260520-SPEC.md`  
**Milestone:** M8 · FR-13  
**Cross-SPEC:** `.work/features/adaptive-teleprompter/20260523-SPEC.md` (+ amendment 01 simplify read zone)

---

## Summary

Adds **opt-in adaptive teleprompter** controls to the prompter UI shell: Settings toggles and player mic button. Scroll/VAD/parser behaviour is specified in **adaptive-teleprompter** SPEC; this amendment binds **prompter-ui** ownership of settings persistence, player chrome, and degradation when adaptive is off.

---

## 2. In scope (additions)

- Settings: **Adaptive teleprompter** + **Auto-sync** toggles (default off)
- Player: microphone button on primary toolbar row; sync active/inactive state
- Settings privacy copy: device-local audio processing
- Editor hint for meta markup syntax (see M8-T8)
- Integration hooks for `frontend/src/prompter/adaptive/` (implemented in M8-T2–T5)

**Out of scope (unchanged for prompter-ui):** VAD algorithm, read-zone math, meta parser, cloud STT — see adaptive-teleprompter SPEC.

---

## 3. Domain language (additions)

| Term | Definition |
|------|------------|
| Adaptive teleprompter | Optional player mode; see adaptive-teleprompter SPEC |
| Auto-sync | Setting: start mic sync when Play is pressed |
| Sync active | Session UI state: mic button on; adaptive controller may run |

---

## 4. Behavioural spec (additions)

Prompter-ui implements **shell rules** below; adaptive-teleprompter SPEC R1–R19 govern listen/scroll semantics.

- **R18.** Settings exposes **Adaptive teleprompter** toggle. Default **off**. When off, player matches base SPEC R3 (fixed-speed scroll only); **no mic button** (adaptive SPEC R2).
- **R19.** When adaptive is on, Settings exposes **Auto-sync** toggle. Default **off** (adaptive SPEC R1b).
- **R20.** Player primary toolbar (`tp-player-toolbar__row--primary`) includes a **mic button** immediately after Play when `adaptiveEnabled` is true (adaptive SPEC R4). Icon-only; `aria-pressed` reflects sync active.
- **R21.** Mic button toggles **sync active** for the session (adaptive SPEC R5). When sync inactive → fixed baseline speed; speed slider value unchanged (adaptive SPEC R16).
- **R22.** When Auto-sync is on and user presses Play, sync becomes active without extra mic tap, subject to permission (adaptive SPEC R6–R6b).
- **R23.** When adaptive is on but mic permission denied, show non-blocking hint; fixed-speed scroll continues (adaptive SPEC R3).
- **R24.** Settings includes privacy line: audio processed on device only; nothing uploaded (adaptive SPEC §10, NFR-12).
- **R25.** Keyboard shortcuts (base R12) unchanged; no new shortcut for mic v1.

---

## 5. Data model (additions)

Extend `tp:settings` JSON:

| Field | Type | Default |
|-------|------|---------|
| `adaptiveEnabled` | `boolean` | `false` |
| `adaptiveAutoSync` | `boolean` | `false` |

`loadSettings` / `saveSettings` merge unknown keys with defaults (backward compatible).

**Session state (not persisted):** `syncActive`, `listenActive` — owned by player/adaptive module; not in `tp:settings`.

---

## 7. Invariants (additions)

- **I5.** `adaptiveEnabled === false` ⇒ mic button not rendered; zero `getUserMedia` (adaptive SPEC I2).
- **I6.** Prompter-ui does not implement VAD or read-zone logic inline — delegates to `prompter/adaptive/` module.

---

## 9. Observability (additions)

Optional client metrics (no audio/script): `adaptive.enabled`, `adaptive.auto_sync.enabled`, `adaptive.sync.start`, `adaptive.sync.stop` — emit from adaptive module; settings toggles may increment on save.

---

## 11. Test plan (additions)

| Rule | Test |
|------|------|
| R18–R19 | vitest Settings: toggles visible when adaptive on; defaults false |
| R20–R21 | vitest/Playwright PlayerControls: mic visible when adaptive enabled; hidden when off |
| R22 | Playwright: auto-sync + play starts sync (mocked mediaDevices) |
| R23 | Playwright: permission denied shows hint; scroll works |
| R24 | vitest: privacy copy present in Settings when adaptive section shown |
| I5 | vitest: adaptive off → no getUserMedia mock calls |

Integration tests for read zone / VAD: adaptive-teleprompter SPEC §11 (M8-T9–T10).

---

## 12. Rollout and rollback

Ship with frontend. Defaults off — no migration. Rollback: hide adaptive settings + mic via revert; existing users keep prior `tp:settings` shape (new fields ignored if old bundle).

---

## Cross-reference map

| prompter-ui rule | Canonical spec |
|------------------|----------------|
| R18–R25, I5–I6 | adaptive-teleprompter R1–R6b, R16, I2, §10 |
| Meta markup hints | adaptive-teleprompter §4 markup table; Editor M8-T8 |
| Scroll/VAD | adaptive-teleprompter + `prompter/adaptive/*` (not prompter-ui inline) |
