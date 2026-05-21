---
name: feature-spec
description: >-
  Author, review, or amend feature SPECs per FEATURE_STANDARD. Use when creating
  a new {FEATURE_SPEC_ROOT}/<slug>/SPEC, reviewing before Approved, writing an
  amendment, or checking SPEC status. Ensures §15 Concept registry and mandatory
  H2 sections. Does not implement code.
---

# feature-spec

Orchestrate **feature SPEC** artifacts under `{FEATURE_SPEC_ROOT}/<feature-slug>/` per `.ai/standards/*FEATURE_STANDARD*` (path from `.cursorrules` `REPLACE:FEATURE_STANDARD_FILE`).

**Tool-agnostic.** **Pairs with:** `concept-run` (§15 registry), `plan-foundation` P3, `code-implementation` (reads Approved SPECs).

**Canonical path:** `.ai/skills/feature-spec/skill.md`

**Hard rules:**

- **SPEC template:** use FEATURE_STANDARD §3 H2 headings exactly - no omissions.
- **§15 required** before **Approved** (or explicit N/A with reason).
- **Approved SPECs are immutable** - changes go in `YYYYMMDD-SPEC-amendment-NN-<slug>.md` siblings.
- **High-risk** SPECs (threat model / FEATURE_STANDARD §2) need ≥2 reviewers before Approved.
- **No code** in this skill unless user explicitly asks to implement after Approved.
- **Filename:** `{FEATURE_SPEC_ROOT}/<slug>/YYYYMMDD-SPEC.md` (date = today when creating).

---

## Parse invocation

| User says | Mode | Action |
|-----------|------|--------|
| `@feature-spec` **create** - \<slug\> | create | New SPEC from template |
| `@feature-spec` **review** - \<path\> | review | Checklist against FEATURE_STANDARD |
| `@feature-spec` **amend** - \<path\> | amend | New amendment file |
| `@feature-spec` **status** - \<path or slug\> | status | Read-only: exists? status header? §15? |
| `@feature-spec` **approve** - \<path\> | approve | Set header Approved after review passes |

**Slug:** kebab-case, informative (`user-auth`, not `feature1`).

---

## Step 0 - Pick a mode

| Mode | Action |
|------|--------|
| **create** | [Create protocol](#create-protocol) |
| **review** | [Review protocol](#review-protocol) |
| **amend** | [Amend protocol](#amend-protocol) |
| **status** | [Status protocol](#status-protocol) |
| **approve** | Run **review** first; on pass, update `**Status:**` to `Approved` |

---

## Create protocol

### CR0 - Brownfield + readiness gates

1. **Brownfield check (hard stop):** if `{FEATURE_SPEC_ROOT}/<slug>/` already exists → **stop** with the [blocked-report shape](#blocked-report-shape):
   - **Required:** slug folder does not already exist
   - **Detected:** `{FEATURE_SPEC_ROOT}/<slug>/` already contains files (list)
   - **Run first:** `@feature-spec amend - <slug>` (to add a SPEC amendment), or pick a different slug, or delete the existing folder if it is a stale stub
2. **Readiness check (warning only - proceed if user confirms):** read latest `{HANDOFF}` for `Plan-master-ready:` row. If absent or **no**, emit:
   - **Warning:** SPEC will not slot into an Approved master plan yet (`plan-master-ready: no` or unknown). The SPEC is still useful for `plan-foundation` P3, but make sure your team expects out-of-plan SPECs.
   - **Run first (optional):** `@plan-foundation certify plan-master-ready` → `@plan-master status`
   - Then **continue** with create if user confirms in the same message.

### CR1 - Author the SPEC

1. Read FEATURE_STANDARD §2–§3, §8 (naming), §15.
2. Confirm slug does not collide with existing bounded-context folder name alone (use verb phrase if needed).
3. Check for related ADRs / foundation docs; list in SPEC header.
4. Create `{FEATURE_SPEC_ROOT}/<slug>/YYYYMMDD-SPEC.md` with all §3 H2 sections.
5. Fill **§15 Concept / NFR registry** - one row per MOD-01…MOD-06 with Applies yes/no + reason (or run `@concept-run list` for trigger hints).
6. Set `**Status:** Draft`.
7. Output create report with path and open questions (§13).

**Stop** if user has not stated problem scope - ask once for one-paragraph purpose.

---

### Blocked-report shape

Per [SKILL_DEPENDENCIES.md § Blocked report shape](../SKILL_DEPENDENCIES.md#blocked-report-shape) - header: `## @feature-spec <command> - blocked (prerequisite)`.

---

## Review protocol

1. Read the SPEC and FEATURE_STANDARD §3, §7 (DoD), §9 (anti-patterns).
2. Check every mandatory H2 present (§3 template).
3. Check §15 filled or justified N/A.
4. Check ADR references exist and are not contradicted.
5. High-risk features: flag if single-reviewer approval requested.
6. Output review report:

```markdown
## feature-spec review - <slug>

**Path:** … · **Status:** Draft | Approved | …

### Checklist
| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | All §3 H2 sections | pass/fail | |
| 2 | §15 concept registry | pass/fail | |
| 3 | ADR alignment | pass/fail/skip | |
| 4 | Test plan (§12) actionable | pass/fail | |
| 5 | Out of scope explicit (§2) | pass/fail | |

### Verdict
approve-ready | needs-revision - <bullets>
```

---

## Amend protocol

1. Confirm base SPEC is **Approved** or **Implemented** (not Draft-only unless user waives).
2. Create `{FEATURE_SPEC_ROOT}/<slug>/YYYYMMDD-SPEC-amendment-NN-<short-slug>.md`.
3. Structure: **Purpose of amendment**, **Binding changes** (numbered), **Evidence** (ADR/questionnaire link), **SPEC sections affected**.
4. Do **not** edit the original SPEC file.
5. Cross-link from amendment to base SPEC and any ADR.

---

## Status protocol

Read-only. Report: path, Status header, last modified, §15 present?, linked ADRs, amendment siblings.

---

## Integration

| Skill / doc | When |
|-------------|------|
| `@concept-run list` | Filling §15 |
| `@plan-foundation` P3 | Foundation-phase SPEC batch |
| `@code-implementation start` | Requires Approved SPEC for feature tasks |
| FEATURE_STANDARD §7 | DoD before marking Implemented |

---

## Anti-patterns

- Merging code before SPEC Approved.
- Editing Approved SPEC in place (use amend).
- Skipping §15 "because M1 is small".
- Empty §2 Out of scope.

---

## Completion checklist

| # | Check | Result |
|---|-------|--------|
| 1 | FEATURE_STANDARD §3 compliance | pass/fail |
| 2 | §15 registry | pass/fail |
| 3 | Slug/path valid | pass |
| 4 | No unauthorized code changes | pass |
