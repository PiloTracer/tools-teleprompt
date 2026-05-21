# Local development stack — proposal

**Status:** Draft — compose files created 2026-05-21 (owner `approve compose`)
**Created:** 2026-05-20  
**Requires:** explicit owner **`approve compose`** before creating `deploy/docker-compose.yml`, `frontend/Dockerfile`, `api/Dockerfile`, `deploy/Caddyfile`, `.env.example` (`.cursorrules` § Protected Files)

**References:** ADR 003, `DOCS_TECH_STACK.md`, `.ai/standards/20260520-DIRECTORY_MAP.md`

---

## 1. Goals

- Single `docker compose` stack for local dev and production-shaped deploy on VPS
- Isolated project name per clone: `COMPOSE_PROJECT_NAME=tools-teleprompt`
- Host ports configurable via `.env`
- Redis **not** exposed to host (internal network only)
- Caddy terminates TLS in production; plain HTTP on localhost for dev

---

## 2. Service table

| Service | Build / image | Purpose | Host exposure |
|---------|---------------|---------|---------------|
| `caddy` | `caddy:2.9-alpine` | Reverse proxy, TLS (prod) | `${CADDY_HOST_PORT:-8080}:80` |
| `frontend` | build `../frontend` | Static SPA (nginx or Caddy file_server inside) | internal only |
| `api` | build `../api` | FastAPI pairing API | internal only |
| `redis` | `redis:7.4-alpine` | Ephemeral session store | **none** (internal) |

**Routing (via Caddy):**

| Path | Upstream |
|------|----------|
| `/` | frontend:80 |
| `/api/*` | api:8000 |
| `/health` | api:8000 |

---

## 3. Networks and volumes

| Name | Type | Notes |
|------|------|-------|
| `teleprompt-net` | bridge | All services |
| `redis-data` | volume | Optional; **disabled** for relay-only (no AOF) — ephemeral container |

Redis runs without persistent volume by default (ADR 002).

---

## 4. Environment variables (`.env.example`)

```bash
COMPOSE_PROJECT_NAME=tools-teleprompt
CADDY_HOST_PORT=8080

# API
API_MAX_SCRIPT_BYTES=262144
API_SESSION_TTL_SECONDS=300
API_RATE_LIMIT_CREATE=10
API_RATE_LIMIT_CLAIM=20
REDIS_URL=redis://redis:6379/0

# Frontend build args
VITE_API_BASE_URL=http://localhost:8080
```

Production: set `VITE_API_BASE_URL` to public origin at build time; Caddy handles HTTPS.

---

## 5. Health checks

| Service | Check |
|---------|-------|
| api | `GET http://api:8000/health` |
| redis | `redis-cli ping` |
| frontend | HTTP 200 on `/` |
| caddy | depends_on healthy api + frontend |

---

## 6. Dev entrypoint

**Proposed script:** `bin/start.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -f deploy/docker-compose.yml --env-file .env up -d --build
echo "Open http://localhost:${CADDY_HOST_PORT:-8080}"
```

Invoke via `@dev-stack` after compose files exist.

---

## 7. Deploy / rollback (production)

| Step | Action |
|------|--------|
| Deploy | `docker compose pull && docker compose up -d --build` on VPS |
| Rollback | `docker compose up -d` previous image tags (pin tags in prod `.env`) |
| Session drain | Redis TTL clears relay automatically; no migration rollback |

**RISK:** R8 mitigated — single replica acceptable v1; Redis shared if API scaled later.

---

## 8. Port plan (defaults)

| Port | Use |
|------|-----|
| 8080 | Caddy HTTP (dev) |
| 443 | Caddy HTTPS (prod, host mapping) |

---

## 9. Files to create on approval

```
deploy/docker-compose.yml
deploy/Caddyfile
frontend/Dockerfile
api/Dockerfile
.env.example
bin/start.sh
```

**Not created until owner approves** — per protected-files policy.

---

## 10. Approval

| Role | Approved | Date |
|------|----------|------|
| Owner — proposal | approved | 2026-05-20 |
| Owner — create compose/Dockerfiles | **approved** (`approve compose`) | 2026-05-21 |

After **`approve compose`**: create protected files, update HANDOFF, verify `docker compose config`.

---

## 11. Alternatives considered

| Option | Why not default |
|--------|-----------------|
| Bare-metal dev | Owner requires dockerized |
| nginx instead of Caddy | Caddy auto-TLS simpler on VPS |
| Expose Redis port | Security; internal only |
