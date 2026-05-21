# ADR 003 - Hosting and deployment topology

**Status:** Decided · 2026-05-20  
**Owner:** eng  
**Supersedes:** -

## Context

Owner requires a **dockerized** web application. v1 targets a single-region, best-effort deployment without HA mandate. The stack is: static frontend, FastAPI, Redis, reverse proxy.

## Decision

We will deploy v1 as **Docker Compose** on a **VPS or any Linux host with Docker** (owner-operated or generic cloud VM).

| Component | Role |
|-----------|------|
| **Caddy** (preferred) or nginx | TLS termination, route `/` → frontend, `/api` → API |
| **frontend** container | Serves built Vite static assets |
| **api** container | FastAPI pairing service |
| **redis** container | Internal network only |

**Compatible alternatives** (same compose manifests): Fly.io, Railway, Hetzner VPS, home server — without AWS-specific services in v1.

CI/CD platform: **deferred** (UNKNOWNS U6); manual `docker compose up` documented in P5/P6.

Production TLS: automatic via Caddy or manual certs on nginx.

## Consequences

**Positive:**

- Matches founder “dockerized” intent
- Portable compose file; no cloud lock-in
- Simple ops for solo-tool scale

**Negative / trade-offs:**

- Owner responsible for VM patching and TLS unless using Caddy
- No managed HA in v1

## Alternatives considered

| Option | Why not |
|--------|---------|
| AWS ECS/EKS | Overkill for v1; not requested |
| Serverless (Lambda + S3) | Pairing API + Redis fits poorly |
| Bare metal without Docker | Conflicts with owner docker requirement |
| Fly.io as primary | Valid alternate; compose-first keeps options open |

## References

- `.work/plans/foundation/20260520-01-tools-teleprompt-initial-scope.md` (dockerized)
- `.work/plans/foundation/20260520-04-foundation-architecture.md` §6–§7
- UNKNOWNS U6 (CI deferred)
