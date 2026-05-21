# code-repair - reference

Supplement to `skill.md`. Invocation examples and source-mode mapping.

---

## Invocation examples

### After code-verify failure

```text
@code-verify uncommitted
# … report fail …
@code-repair repair - from uncommitted
```

```text
@code-verify milestone
@code-repair repair - from milestone
```

```text
@code-verify last
@code-repair repair - from last
```

**Note:** `@code-verify audit` is an alias for **uncommitted** when the tree is dirty (`code-verify/skill.md` § Parse invocation).

### After db-migration verify failure

```text
@db-migration verify
@code-repair repair - from migration
```

### After feature-spec review failure

```text
@feature-spec review - identity/20260518-SPEC.md
@code-repair repair - from feature-spec - identity/20260518-SPEC.md
```

### Custom brief

```text
@code-repair repair - custom - fix lint in apis/src/foo.py and add missing test for R3 edge case
```

### Default (infer source)

```text
@code-repair
@code-repair repair
```

### Status (read-only)

```text
@code-repair status
```

---

## Mode comparison

| | repair | status |
|---|--------|--------|
| Reads HANDOFF / NEXT | yes | yes |
| Modifies code / SQL | yes | no |
| Re-runs verifier | yes | no |
| Completion checklist | yes | no |

---

## Source → re-verify quick map

| `repair - from …` | Run first (if no report) | Re-run after fix |
|-------------------|--------------------------|------------------|
| uncommitted | `@code-verify uncommitted` | `@code-verify uncommitted` |
| milestone | `@code-verify milestone` | `@code-verify milestone` |
| last | `@code-verify last` | `@code-verify last` |
| migration | `@db-migration verify` | `@db-migration verify` |
| feature-spec - \<path\> | `@feature-spec review - <path>` | `@feature-spec review - <path>` |
| custom | (user brief) | `@code-verify uncommitted` + brief-specific checks |

---

## When to use code-repair vs code-implementation continue

| Situation | Use |
|-----------|-----|
| Mid-batch task gate fail | Fix in-session; `code-implementation` post-fix re-gate |
| Post `@code-verify` / sweep fail with multiple findings | `@code-repair repair - from …` |
| User gives ad-hoc fix list not tied to one task | `@code-repair repair - custom - …` |
| Migration script not idempotent on second run | `@code-repair repair - from migration` |

---

## Wrong prompts

| Prompt | Problem | Use instead |
|--------|---------|-------------|
| `@code-repair` without any findings | No F* table | Run verifier first or paste report |
| **repaired** without re-verify output | Violates skill | R4 mandatory |
| Repair master plan gaps | Wrong layer | `@plan-master revise` |
| Mass backfill in repair | Forbidden | Present SQL to human per `.cursorrules` |
