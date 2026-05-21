# feature-spec - reference

Supplement to `skill.md`. Invocation examples, mode comparison, and edge cases.

---

## Invocation examples

### Cursor

```
@feature-spec create - user-auth
@feature-spec review - .work/features/user-auth/YYYYMMDD-SPEC.md
@feature-spec amend - .work/features/<slug>/YYYYMMDD-SPEC.md
@feature-spec status - master-data
@feature-spec approve - .work/features/<slug>/YYYYMMDD-SPEC.md
```

### Claude Code / opencode / Codex

```
Follow .ai/skills/feature-spec/skill.md - create - user-auth.
```

```
Follow .ai/skills/feature-spec/skill.md - review - .work/features/<slug>/YYYYMMDD-SPEC.md.
```

```
Follow .ai/skills/feature-spec/skill.md - status - master-data. Read-only.
```

---

## Mode comparison

| | create | review | amend | status | approve |
|---|---|---|---|---|---|
| Read FEATURE_STANDARD | yes | yes | yes | no | yes (via review) |
| Write SPEC | yes | no | no | no | header only |
| Write amendment | no | no | yes | no | no |
| Check §15 registry | yes | yes | no | yes | yes |
| ADR alignment check | yes | yes | yes | yes | yes |
| Completion checklist | yes | yes | yes | no | no |

---

## SPEC path convention

```
{FEATURE_SPEC_ROOT}/<slug>/YYYYMMDD-SPEC.md
```

Examples (`.work/features/` in the adopting repo):
- `.work/features/<slug>/YYYYMMDD-SPEC.md`
- `.work/features/<slug>/YYYYMMDD-SPEC.md`
- `.work/features/<slug>/YYYYMMDD-SPEC.md`
- `.work/features/<another-slug>/YYYYMMDD-SPEC.md`
- `.work/features/<another-slug>/YYYYMMDD-SPEC.md`
- `.work/features/<slug>/YYYYMMDD-SPEC-amendment-01.md`

Amendment filenames:
```
{FEATURE_SPEC_ROOT}/<slug>/YYYYMMDD-SPEC-amendment-NN-<short-slug>.md
```

---

## Edge cases

| Situation | Behavior |
|-----------|----------|
| SPEC exists but is Draft | Review returns `needs-revision` until all §3 sections filled |
| §15 missing at approve | Approve blocked until §15 filled or N/A justified per concept id |
| Approved SPEC has defect | Use **amend** - never edit the Approved SPEC in place |
| Single reviewer on high-risk SPEC (threat model) | Flag in review; gate blocks approve unless ADR/owner waives |
| Slug collision with another SPEC | Block create; suggest distinguishing slug (e.g. `oauth-login` vs `user-auth`) |
| FEATURE_STANDARD path moved | Read `.ai/standards/` for latest `*FEATURE_STANDARD*` by date prefix |
| No concept pack in repo | §15 required anyway; mark each MOD row `N/A - no pack` with reason |
| §2 Out of scope empty | Review fails - must be explicit, not `TBD` |

---

## Integration with other skills

| Skill | When |
|-------|------|
| `concept-run list` | Filling §15 concept registry during create |
| `plan-foundation` P3 | Authoring SPECs as part of foundation phase |
| `code-implementation` | Reads Approved SPECs before implementing tasks in that context |

---

## Anti-patterns

- Editing an Approved SPEC in place instead of creating an amendment.
- Approving without §15 filled (even if grandfather-clause is used, document it).
- Creating a SPEC with no ADR links when architectural decisions exist.
- Using `@feature-spec create` for a context already covered by an existing SPEC.

---

## Wrong prompts

| Prompt | Problem | Use instead |
|--------|---------|-------------|
| `@feature-spec create -` (no slug) | No target | Provide a kebab-case slug |
| `@feature-spec create - master-data` (duplicate) | SPEC already exists | `@feature-spec amend` or `review` |
| Editing SPEC after Approved without amend | Violates immutable rule | `@feature-spec amend - <path>` |
| Marking SPEC Implemented in this skill | Wrong stage | `code-implementation complete` updates status |
