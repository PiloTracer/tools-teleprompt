# Front-end stack — tools-teleprompt (UI Design OS)

**Updated:** 2026-05-23 · **Linked:** `.cursorrules` UI block · **Engineering:** `DOCS_TECH_STACK.md`

## Runtime

| Item | Value |
|------|-------|
| Framework | React 19 + Vite 6 SPA (PWA) |
| Language | TypeScript 5.8 strict |
| Styling | **vanilla-css** (active) — tokens on `:root`; rules: `.ai.ui/style-stacks/vanilla-css.md` |
| Package manager | npm |

## Tooling (`.cursorrules` UI block)

| Check | Command (host) | Command (Docker) |
|-------|----------------|------------------|
| Unit tests | `cd frontend && npm test` | `docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npm test"` |
| Lint | `cd frontend && npm run lint` | `docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npm run lint"` |
| Typecheck | `cd frontend && npm run typecheck` | `docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npm run typecheck"` |
| E2E / visual | `cd frontend && npm run test:e2e` | optional Playwright in container |

## Paths

| Item | Path |
|------|------|
| App root | `frontend/` |
| Components | `frontend/src/components/` (adjust per DIRECTORY_MAP after foundation) |
| Screens / views | `frontend/src/` (routes/pages) |
| Tokens | `frontend/src/styles/tokens.css` (planned) — map in foundation doc 02 |
| Storybook | n/a (v1) |

## Docker

| Service | Workdir |
|---------|---------|
| `frontend` | `/app` |

## Coexistence

- Agent OS: `.ai/` + `.work/`
- UI Design OS: `.ai.ui/` + `.work.ui/`
- See `.ai.ui/COHABITATION.md`
