---
name: ui-process-router
description: >-
  Read-only router for UI Design OS questions. Maps to ui-* skills, UI standards,
  UIS concepts, or .work.ui/ paths. Does not replace Agent OS process-router.
---

# ui-process-router

**Hard rules:** No file writes. Link canonical sources; ≤3 sentences in answer.

## Modes

| User says | Mode |
|-----------|------|
| `@ui-process-router - <question>` | route |
| `@ui-process-router help` | help |

## Route protocol

Classify: bootstrap · foundation · screen-spec · build · verify · a11y · design-system · concept · cohabitation · learn

Output format — see [`PROCESS_ROUTER.md`](../../PROCESS_ROUTER.md). Routing table: `reference.md`.

**Escalate:** If question is about `@session-control`, `@code-implementation`, MOD prompts, or `.work/plans/` → redirect to `@process-router` (`.ai/`).
