# Technology stack — tools-teleprompt

**Status:** Pinned for v1 implementation  
**Updated:** 2026-05-20  
**Linked from:** `.cursorrules` · ADRs 001–003

---

## 1. Summary

| Layer | Choice | Version (pin) | Notes |
|-------|--------|---------------|-------|
| Language (frontend) | TypeScript | 5.8.x | strict mode |
| Language (API) | Python | 3.12.x | |
| Frontend framework | React | 19.x | SPA |
| Build tool | Vite | 6.x | + vite-plugin-pwa |
| HTTP API | FastAPI | 0.115.x | |
| ASGI server | uvicorn | 0.34.x | |
| Ephemeral store | Redis | 7.4-alpine | pairing relay only |
| Database | — | n/a | v1 excluded |
| Auth | — | n/a | anonymous + OTP capability |
| Hosting | Docker Compose | Compose v2 | VPS / container host (ADR 003) |
| Reverse proxy | Caddy | 2.9.x | preferred |

---

## 2. Key libraries

| Area | Package | Pin (semver) |
|------|---------|--------------|
| Markdown | markdown-it | ^14.0 |
| Sanitize | dompurify | ^3.2 |
| QR generate | qrcode | ^1.5 |
| Redis client | redis (py) | ^5.2 |
| Validation | pydantic | ^2.10 |
| FE test | vitest | ^3.0 |
| FE lint | eslint | ^9.x |
| API test | pytest | ^8.x |
| API lint | ruff | ^0.9 |
| API types | pyright | ^1.1 |

---

## 3. Repository layout

| Path | Purpose |
|------|---------|
| `frontend/` | prompter-ui (React + Vite + PWA) |
| `api/` | pairing-api + platform (FastAPI) |
| `deploy/` | Compose, Caddy/nginx |
| `.ai/standards/20260520-*` | Project conventions |
| `.work/` | Plans, SPECs, ADRs |

See `.ai/standards/20260520-DIRECTORY_MAP.md`.

---

## 4. Local development

| Item | Value |
|------|--------|
| Dev stack script | `bin/start.sh` (P5 — pending owner approval for compose) |
| Dev compose file | `deploy/docker-compose.dev.yml` |
| Prd compose file | `deploy/docker-compose.prd.yml` |
| Frontend test | `cd frontend && npm test` |
| Frontend lint | `cd frontend && npm run lint` |
| Frontend typecheck | `cd frontend && npm run typecheck` |
| API test | `cd api && pytest tests/ -q` |
| API lint | `cd api && ruff check .` |
| API typecheck | `cd api && pyright .` |

**Docker (canonical after P5):**

```bash
docker compose --project-directory deploy -f deploy/docker-compose.dev.yml exec api bash -c "cd /app && pytest tests/ -q"
docker compose --project-directory deploy -f deploy/docker-compose.dev.yml exec frontend bash -c "cd /app && npm test"
```

---

## 5. CI/CD

| Item | Status |
|------|--------|
| Platform | **TBD** (UNKNOWNS U6) |
| Deploy targets | single production + local dev |

---

## 6. Environment variables (draft)

| Var | Service | Purpose |
|-----|---------|---------|
| `API_MAX_SCRIPT_BYTES` | api | default 262144 (256 KB) |
| `API_SESSION_TTL_SECONDS` | api | default 300 |
| `API_RATE_LIMIT_CREATE` | api | per IP / 15 min |
| `REDIS_URL` | api | internal redis URL |
| `VITE_API_BASE_URL` | frontend | build-time API origin |

---

## 7. Open decisions

| ID | Topic | Owner |
|----|-------|-------|
| U6 | CI platform | eng |
| U8 | QR fragment byte threshold | eng |

Track in `.work/plans/UNKNOWNS.md`.

---

## 8. ADR cross-reference

| ADR | Topic |
|-----|-------|
| 001 | Application stack |
| 002 | Redis ephemeral store |
| 003 | Hosting / Compose |
| 004 | Tenancy model |
| 005 | Markdown sanitization |

Rationale in `.work/decisions/` — this file holds **pins only**.
