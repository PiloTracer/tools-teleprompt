---
name: ui-screen-spec
description: >-
  Author, review, amend screen SPECs per SCREEN_SPEC_STANDARD under .work.ui/screens/.
  Use create - <slug>, review - <path>, amend - <slug>, status.
---

# ui-screen-spec

**Path (mandatory):** `<repo-root>/.work.ui/screens/<slug>/YYYYMMDD-SCREEN-SPEC.md`  
Placeholder: `{SCREEN_SPEC_ROOT}/<slug>/YYYYMMDD-SCREEN-SPEC.md`

**Template source (copy only):** `.ai.ui/templates/work.ui/screens/example-slug/YYYYMMDD-SCREEN-SPEC.md.template`

**Standards:** `SCREEN_SPEC_STANDARD` · `SURFACE-AND-CONTROL-CRAFT` · `examples/<folder>/manifest.md`

## Modes

| Mode | Action |
|------|--------|
| `create - <slug>` | New SPEC from template; pattern extraction protocol below |
| `review - <path>` | Checklist against SCREEN_SPEC_STANDARD + craft gates |
| `amend - <slug>` | Amendment file; do not edit Approved SPEC in place |
| `status` | List SPECs by status |

## Prerequisites

- **screen-spec-ready: yes** from `@ui-design-foundation certify` (or HANDOFF_UI waiver)

## create — pattern extraction

Follow [`examples/INDEX.md`](../../examples/INDEX.md) § playbook (Phases A–C). On `create`: copy manifest **extractedRules** → §11 + §13; **primitives** → §8; add UIS-07 when craft tier ≥ refined.

## Hard rules

- No API schema duplication — link `.work/features/` SPECs
- §12 UIS registry mandatory before `Approved`
- §13 **exampleIds** + **extractedRules** mandatory when craft tier ≥ refined (or N/A waiver in HANDOFF_UI)
- §8 must not allow native range/select/checkbox on primary flows if §13 cites examples requiring catalog primitives — unless `native allowed` waiver per row

## review checklist (additions)

- [ ] §13 shape matches SCREEN_SPEC_STANDARD §5
- [ ] §11 includes manifest extractedRules
- [ ] §8 catalog status consistent with CATALOG.md
- [ ] Invalid: cites `mobile-controls/C1` but native `<input type="range">` without waiver

## Approval

Only human or explicit user message may set `Status: Approved`.

**Do not** `@ui-component-build plan` screen tasks until **Approved** and P0 primitives **done** (or documented waiver).
