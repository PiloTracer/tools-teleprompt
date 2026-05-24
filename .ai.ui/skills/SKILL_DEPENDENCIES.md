# UI skill dependency graph

**Purpose:** Gates for **ui-*** skills only. Agent OS gates live in `.ai/skills/SKILL_DEPENDENCIES.md`.

## Work tree path resolution (mandatory)

**Repository root** (`.git/`, `.cursorrules`) is **not** `{WORK_UI_ROOT}`. All `ui-*` skills resolve paths from **repo root** (parent of `.ai.ui/` in nested layouts).

| Placeholder | Resolved path | Common wrong path |
|-------------|---------------|-------------------|
| `{WORK_UI_ROOT}` | `.work.ui/` | `.ai.ui/.work.ui/`, `work.ui/`, paths under `templates/work.ui/` |
| `{HANDOFF_UI}` | `.work.ui/context/HANDOFF_UI.md` | `context/HANDOFF_UI.md`, `HANDOFF_UI.md` at repo root |
| `{UI_ITERATION_CARRIER}` | `.work.ui/plans/NEXT_UI.md` | `plans/NEXT_UI.md`, Agent OS `NEXT.md` |
| `{SCREEN_SPEC_ROOT}` | `.work.ui/screens/` | `.work/features/`, `.ai.ui/screens/` |
| `{UI_PLANS_ROOT}` | `.work.ui/plans/` | `plans/` without `.work.ui/` |
| `{UI_DECISIONS_ROOT}` | `.work.ui/decisions/` | `.ai.ui/decisions/` (pointer only) |
| `{UI_DESIGN_SYSTEM_ROOT}` | `.work.ui/design-system/` | catalog only in `.ai.ui/` |
| `{UI_ROADMAP}` | `.work.ui/plans/full/*-ui-roadmap.md` | `.work/plans/full/*-full-plan.md` |

**Write rule:** Every skill artifact (SPECs, foundation docs, `NEXT_UI` iteration, `CATALOG.md`, registry rows) MUST be written under the **Resolved path** column. Framework templates under `.ai.ui/templates/work.ui/` are **copy sources only** — not the live project tree.

**Read rule:** In mandatory-read tables and blocked reports, use resolved paths. Shorthand `HANDOFF_UI` / `NEXT_UI` means the paths above.

---

## Readiness states

```text
ui-bootstrap (scaffold)
        ↓
ui-foundation-complete  →  screen-spec-ready  →  ui-implementation-ready
   ui-design-foundation      ui-design-foundation certify
                             ui-component-build + verify
```

| State | Certified by | Unlocks |
|-------|--------------|---------|
| *(scaffold)* | `@ui-bootstrap init` | `@ui-design-foundation greenfield` |
| **ui-foundation-complete** | `@ui-design-foundation status` | `certify` |
| **screen-spec-ready** | `@ui-design-foundation certify screen-spec-ready` | `@ui-screen-spec create` |
| **ui-implementation-ready** | `@ui-component-build status` + verify pass on active milestone | Broad UI iteration |

---

## Dependency matrix (summary)

| Skill / mode | Depends on | Gate |
|--------------|------------|------|
| **ui-bootstrap** `init` | `.ai.ui/` present; must not overwrite `.work/` or base `.cursorrules` | - |
| **ui-design-foundation** `greenfield` | `{HANDOFF_UI}`; UI standards paths in `.cursorrules` snippet | Recommended: `@ui-bootstrap init` |
| **ui-design-foundation** `certify screen-spec-ready` | **ui-foundation-complete: yes** | **Required** |
| **ui-screen-spec** `create` | SCREEN_SPEC_STANDARD; **screen-spec-ready** | **Required** (warn if no) |
| **ui-component-build** `plan` | Approved screen SPEC(s) for milestone | **Required** |
| **ui-component-build** `start` / `continue` | Valid `NEXT_UI.md` UI iteration; screen-spec-ready or waiver in HANDOFF_UI | **Required** |
| **ui-component-build** `complete` | `@ui-visual-verify milestone` + `@ui-accessibility-audit milestone` pass | **Required** |
| **ui-component-build** `complete` (craft tier ≥ refined) | `@ui-concept-run - UIS-07` on milestone diff | **Required** |
| **ui-visual-verify** / **ui-accessibility-audit** | Active UI milestone in NEXT_UI | Per skill |
| **ui-concept-run** `run` | UIS trigger table | Per `.ai.ui/concepts/README.md` |
| **ui-process-router** | - | Read-only |
| **ui-project-approach** | - | Read-only (optional write to HANDOFF_UI on user request) |
| **ui-style-stack** `set` | Recommended: before `ui-design-foundation greenfield` | Warn if missing |
| **ui-component-build** `start` | Active style stack in HANDOFF_UI or user-named in message | Recommended |

---

## Redirect cheat sheet

| User tried | Run next |
|------------|----------|
| `@ui-screen-spec create` | `@ui-design-foundation certify screen-spec-ready` |
| `@ui-component-build start` | `@ui-component-build plan - S{N}` |
| UI session close / commit | `@session-control close` (Agent OS) |
| Backend migration | `@db-migration` (Agent OS) — not a ui-* skill |

---

## Blocked report shape

```markdown
## @<ui-skill> <command> - blocked (prerequisite)
**Required:** …
**Detected:** …
**Run first:** `@…`
```
