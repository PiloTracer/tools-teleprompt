# Adaptive Teleprompter — SPEC amendment 01 (simplify read zone)

**Status:** Approved  
**Approved:** 2026-05-23 (owner simplification)  
**Amends:** `.work/features/adaptive-teleprompter/20260523-SPEC.md`  
**Evidence:** Owner direction — keep adaptive “straight-forward and simple”; when listen works, hold the read line upper-middle in the viewport.

---

## Purpose of amendment

Simplify v1 adaptive behaviour. **Primary job:** when the app can listen, keep the **line being read** in a fixed **read zone** — slightly above centre, still near the vertical middle. Secondary: pause on silence; quick pass-through on meta lines. No speech-rate matching, no slider movement, no transcript alignment.

---

## Binding changes

### 1. Purpose (§1) — replace emphasis

**New summary (binding intent):** Adaptive mode uses mic + simple voice activity. While the speaker talks, scroll at **baseline speed** so the estimated read line sits in the **read zone** (upper-middle of the viewport). On silence, **pause**. When sync is off or listen unavailable, **normal fixed-speed scroll** only.

Meta lines still scroll faster; markup syntax table unchanged.

### 2. Domain language (§3) — add

| Term | Definition |
|------|------------|
| Read zone | Fixed vertical band in the player viewport where the **current read line** should sit while sync is active |
| Read zone center | Target anchor: **42%** of viewport height from the top (`assumption`; tunable constant, not user-facing v1) |
| Read zone band | **35%–48%** from top (`assumption`) — “slightly toward the top end, still close to vertical middle” |
| Estimated read line | Nearest script line boundary to read zone center (from line-index → pixel map); no STT / word alignment |

### 3. Behavioural spec — simplify / supersede

**R8 (revised).** While **sync active**, **playing**, and **VAD on**:

- Scroll at **baseline speed** only (user speed slider).
- **Read zone goal:** estimated read line stays within the read zone band (35%–48% from top). Controller scrolls forward while speaking; no dynamic speed matching, no optional 1.25× nudge (removed).

**R8b (new).** Read zone is a **layout target**, not precision lip-sync. v1 does not require STT or word timing; line estimate from scroll position + line map is sufficient.

**R8c (new).** If listen is unavailable or sync inactive → baseline fixed-speed scroll; read zone logic **off**.

**R14 (revised).** Meta regions use **2×** baseline scroll speed (was 3×) — enough to skim directions quickly; keep implementation simple.

**R15 (revised).** Meta lines: do not pause for VAD on meta; advance through meta at 2× while playing. Do not skip spoken lines. No “adjacent spoken content active” heuristic required v1.

**R16 (unchanged).** Internal multipliers only; speed slider does not move.

**Remove from v1 binding:** optional ≤1.25× lag nudge (former R8 bullet); complex speed adaptation to speech rate.

### 4. In scope (§2) — clarify

Add bullet: **Read zone positioning** — upper-middle viewport anchor while listen + speech active.

### 5. Test plan (§11) — add / revise

| Rule | Test |
|------|------|
| R8, R8b | vitest: while VAD on, scroll delta = baseline; estimated read line Y stays within 35%–48% band (fixture layout) |
| R14–R15 | vitest: meta region uses **2×** multiplier; spoken lines not skipped |
| R8c | sync off → read zone logic not applied |

### 6. Resolved decisions — add

| ID | Decision | Date |
|----|----------|------|
| Q7 | **Simple read zone:** listen active → keep read line in upper-middle band (~42% center, 35–48% band). Baseline speed while speaking; pause on silence. No speech-rate chasing. | 2026-05-23 |

---

## SPEC sections affected

| Section | Change |
|---------|--------|
| §1 Purpose | Simpler framing |
| §2 In scope | Read zone bullet |
| §3 Domain language | Read zone terms |
| §4 R8, R8b, R8c, R14, R15 | Revised rules |
| §11 Test plan | Read zone + 2× meta tests |
| §15 Resolved | Q7 row |

---

## Out of scope for this amendment

- Cloud STT, word-level alignment (unchanged)
- Visual read-zone overlay / debug UI (optional dev-only, not product v1)
- Changes to `markdown-render` amendment 01

---

## Implementation note (non-binding)

Prefer one scroll loop: `baselineSpeed × (inMeta ? 2 : 1) × (vadSpeaking ? 1 : 0)` while playing and sync active. Read zone tuning is mostly **when** to scroll, not **how fast** beyond baseline and meta 2×.
