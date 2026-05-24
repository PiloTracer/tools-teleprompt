---
name: ui-component-build
description: >-
  Execute UI implementation iterations from NEXT_UI.md: plan milestone S{N},
  implement tasks with UI task gate, complete with visual and a11y verify.
  Pairs with Agent OS code-implementation for non-UI files.
---

# ui-component-build

Mirror of Agent OS `code-implementation` **for UI scope only**.

**Output root (mandatory):** `<repo-root>/.work.ui/` — iteration carrier `{UI_ITERATION_CARRIER}` = `.work.ui/plans/NEXT_UI.md`; session state `{HANDOFF_UI}` = `.work.ui/context/HANDOFF_UI.md`.

**Code changes** go to application paths (`REPLACE:UI_APP_ROOT`, etc.) per task file list — not under `.work.ui/` except plans/context/design-system docs.

**Does not:** run `@session-control`, modify `{ITERATION_CARRIER}` (`NEXT.md`), or certify `implementation-ready` for backend.

## Modes

| Mode | Action |
|------|--------|
| `status` | Read-only task matrix |
| `plan - S{N}` | Write `## Current UI iteration` from screen map / approved SPECs |
| `start` | Mandatory reads: screen SPEC, UI_CONVENTIONS, COMPONENT_STANDARD, HANDOFF_UI, SURFACE-AND-CONTROL-CRAFT |
| `continue` | Next task(s); UI task gate each |
| `complete` | After `@ui-visual-verify milestone` + `@ui-accessibility-audit milestone` |

## Milestone ordering (primitive-first)

| Milestone | Scope | Gate |
|-----------|-------|------|
| **S0** (or S1-a) | Catalog **P0 primitives** from foundation doc 03 | CATALOG status `done` + Storybook |
| **S1-b** | Screen composition from approved SPECs | §8 primitives all `done` or waived |
| **S2** | Polish: spacing, motion (UIS-03), hierarchy (UIS-01) | UIS-07 when tier ≥ refined |

**Block screen tasks** when:

- Screen SPEC status ≠ `Approved`
- SPEC §8 lists primitive with status `planned` and no `native allowed` waiver
- Craft tier ≥ refined and implementation uses browser-default range/select/checkbox on cited control flows

## Valid UI iteration block

Same structure as Agent OS iteration block but in `NEXT_UI.md`:

- Milestone `S{N}`, tasks `S{N}-T{k}`, file list, acceptance criteria, `### UIS registry`
- Tag tasks `primitive` vs `screen` in task title or Notes

## UI task gate

| Check | Source |
|-------|--------|
| Lint / type / unit tests | `.cursorrules` UI commands (`REPLACE:UI_*`) |
| No raw hex in changed components | DESIGN_TOKENS_STANDARD |
| UIS-06 when agent-assisted | `@ui-concept-run - UIS-06` |
| UIS-07 when craft tier ≥ refined | `@ui-concept-run - UIS-07` |
| SPEC §13 compliance | extractedRules reflected in diff |
| Scope | Only declared UI paths |

## Full-stack tasks

If task lists backend files → user runs `@code-implementation` for those files in same session; both gates must pass.

## complete protocol

1. `@ui-visual-verify milestone` (includes craft checklist)
2. `@ui-accessibility-audit milestone`
3. Update HANDOFF_UI + NEXT_UI; cross-link `.work/context/HANDOFF.md` § UI layer

See `reference.md` for NEXT_UI template (optional).
