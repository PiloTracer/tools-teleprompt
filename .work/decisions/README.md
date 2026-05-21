# Architectural Decision Records (ADRs)

Project-specific ADRs. Process: `.ai/skills/plan-foundation/skill.md` P2 · pointer: `.ai/decisions/README.md`.

## Conventions

- **Filename:** `YYYYMMDD-NNN-short-slug.md` (3-digit zero-padded NNN)
- **Status:** `Proposed | Decided | Deferred | Superseded by <ADR id>`
- **Sections:** Context · Decision · Consequences · Alternatives · References
- **Never edit** a `Decided` ADR - supersede with a new file
- Foundation register in `*-04-foundation-architecture.md` §11 must agree; **ADRs win** on conflict

## Index

| ADR | Topic | Status |
|-----|-------|--------|
| [001](20260520-001-application-stack.md) | Application stack (React/Vite, FastAPI, PWA libs) | Decided |
| [002](20260520-002-ephemeral-redis-store.md) | Ephemeral session store (Redis 7) | Decided |
| [003](20260520-003-hosting-deployment.md) | Hosting (Docker Compose on VPS/container host) | Decided |
| [004](20260520-004-tenancy-model.md) | Tenancy (single public instance, no accounts) | Decided |
| [005](20260520-005-markdown-sanitization.md) | Markdown render + HTML sanitization | Decided |

**Template:** `.ai/templates/work/decisions/YYYYMMDD-NNN-slug.md.template`
