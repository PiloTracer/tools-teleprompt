---
name: ui-design-foundation
description: >-
  Establish UI foundation: design tokens doc, pattern inventory, screen map,
  a11y baseline. Certifies screen-spec-ready. Use greenfield, status, certify.
---

# ui-design-foundation

**Output root (mandatory):** `{WORK_UI_ROOT}` = **`<repo-root>/.work.ui/`** (sibling to `.ai.ui/`). Never write foundation docs under `.ai.ui/`.

Produces under `{UI_PLANS_ROOT}/foundation/` (= `.work.ui/plans/foundation/`):

| Doc | Purpose |
|-----|---------|
| `YYYYMMDD-01-ui-vision-and-principles.md` | Vision, **archetype**, complexity, style stack, **craft tier** |
| `YYYYMMDD-02-design-tokens.md` | Maps to `REPLACE:UI_TOKENS_FILE`; **surface/elevation** tokens when tier ≥ refined |
| `YYYYMMDD-03-pattern-inventory.md` | Existing vs needed components; **example id** + catalog primitive per row |
| `YYYYMMDD-04-screen-map.md` | Slugs, routes, priority, dependencies |

Updates `{HANDOFF_UI}` (`.work.ui/context/HANDOFF_UI.md`) with **UI foundation state**.

Also update when changed: `.work.ui/plans/ASSUMPTIONS.md`, `RISK_REGISTRY.md`, `UNKNOWNS.md`.

## Before greenfield

Recommend: `@ui-project-approach - <description>` · `@ui-style-stack set - <stack>` · pick **2–4 example ids** from `examples/INDEX.md`.

## greenfield (craft)

Set **craft tier** in doc 01; `--surface-*` in doc 02 when tier ≥ refined; doc 03 rows cite **example id** + primitive. Record ids in HANDOFF_UI. See [`SURFACE-AND-CONTROL-CRAFT`](../../standards/20260523-SURFACE-AND-CONTROL-CRAFT.md) §1–2 and [`examples/INDEX.md`](../../examples/INDEX.md) playbook.

## Modes

| Mode | Action |
|------|--------|
| `greenfield` | Create docs 01–04 (see greenfield protocol above) |
| `status` | Read-only readiness |
| `certify screen-spec-ready` | Gate: all foundation docs present + token file exists |

## certify gate

**Required:** ui-foundation-complete (all four docs, tokens linked in HANDOFF_UI).

**Unlocks:** `@ui-screen-spec create`

## Pairs with

- `@ui-design-system init` after tokens doc
- Agent OS `@plan-foundation` — parallel; cross-link FRs in screen map, do not duplicate
