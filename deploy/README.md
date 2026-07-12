# Deployment — tools-teleprompt

**Dev stack:** Caddy (reverse proxy) · Vite dev frontend · FastAPI pairing API · Redis 7 (ephemeral relay)

**Prd stack:** Host nginx (reverse proxy) · nginx static frontend · FastAPI pairing API · Redis 7 (ephemeral relay)

**Full production VPS (Cloudflare + Ubuntu):** local runbook + Origin certs live under `credentials/` (gitignored) — `credentials/setup-full.md` and `credentials/host-nginx.teleprompt.aiepic.app.conf`.

---

## Prerequisites

- Docker Engine 24+ with Compose v2
- Host ports available:
  - **dev**: `CADDY_HOST_PORT` (default **9080**) for Caddy; `FRONTEND_HOST_PORT` (default **9173**) for Vite dev/HMR
  - **prd**: `FRONTEND_HOST_PORT` (default **9080**) for the static frontend; `API_DEV_PORT` (default **8000**) for the API
- TLS certificate (production) — terminate at host nginx or upstream load balancer

---

## Quick start (single VPS)

1. Clone the repository and copy the environment template for your context:

   ```bash
   cp .env.example .env.dev    # local dev / hotspot
   cp .env.example .env.prd    # production-like
   ```

2. Set values in `.env.dev` or `.env.prd`. See **Environment variables** below. For **prd**, make sure `STACK_ENV=prd` and `COMPOSE_PROJECT_NAME=tools-teleprompt-prd`.

3. Start the stack:

   ```bash
   bin/start.sh dev start      # dev context
   bin/start.sh prd start      # production context
   # or interactive menu: bin/start.sh [dev|prd]
   ```

   `bin/start.sh` loads `.env.{dev|prd}` for the given context (`dev` default). **prd** requires `.env.prd` (no fallback). Variables are passed into API and frontend containers via `env_file`, not only compose interpolation.

4. Verify health:

   ```bash
   # dev
   curl -sS "http://localhost:${CADDY_HOST_PORT:-9080}/health"
   # prd
   curl -sS "http://localhost:${API_DEV_PORT:-8000}/health"
   ```

   Expect HTTP 200 with JSON body indicating API + Redis reachable.

5. Open the app:

   - dev: `http://localhost:${CADDY_HOST_PORT:-9080}/`
   - prd: `http://localhost:${FRONTEND_HOST_PORT:-9080}/` (or your host nginx URL)

Direct Vite dev + HMR WebSocket (optional): `http://localhost:${FRONTEND_HOST_PORT:-9173}/`.

---

## Environment variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `STACK_NAME` | no | `tools-teleprompt` | Base name for containers/volumes |
| `STACK_ENV` | no | `dev` | Environment suffix (`-dev`, `-staging`, …) |
| `COMPOSE_PROJECT_NAME` | no | `${STACK_NAME}-${STACK_ENV}` | Compose project prefix |
| `PUBLIC_HOST` | no | `localhost` | LAN/hotspot IP for handoff URL hints (e.g. `10.42.0.1`) |
| `PUBLIC_ORIGIN` | no | *(derived)* | Full SPA origin for QR/LAN links; overrides `PUBLIC_HOST`+port. Shorter URLs fit more script in a QR (D14). |
| `API_PUBLIC_BASE_URL` | no | `http://localhost:9080` | Public API base for LAN claim URLs |
| `CADDY_HOST_PORT` | no | `9080` | **dev only** — host port → Caddy :80 (primary app URL) |
| `FRONTEND_HOST_PORT` | no | `9173` | dev: Vite dev/HMR host port; prd: static frontend host port (default **9080**) |
| `FRONTEND_DEV_PORT` | no | `5173` | **dev only** — Vite listen port inside container |
| `API_DEV_PORT` | no | `8000` | API listen port inside container; exposed on host in prd |
| `API_MAX_SCRIPT_BYTES` | no | `262144` | Max relay script size (256 KB) |
| `API_SESSION_TTL_SECONDS` | no | `300` | Relay TTL (5 min) |
| `API_RATE_LIMIT_CREATE` | no | `10` | Creates per IP per window |
| `API_RATE_LIMIT_CLAIM` | no | `20` | Claims per IP per window |
| `API_OTP_HMAC_SECRET` | **yes (prod)** | dev placeholder | Rotate before production; never commit |
| `REDIS_URL` | no | `redis://redis:6379/0` | Internal compose network |
| `VITE_API_BASE_URL` | build-time | empty (same-origin) | Set to public URL if API on different origin |

---

## Security headers

- **dev**: `deploy/Caddyfile.dev` sets CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- **prd**: `frontend/nginx.prd.conf` sets the same headers on the static frontend. Host nginx must preserve or re-add them when proxying.

Cross-check: `.ai/standards/20260520-threat-model.md`.

Verify after deploy:

```bash
# dev
curl -sI "http://localhost:${CADDY_HOST_PORT:-9080}/" | grep -iE 'content-security-policy|x-frame-options|x-content-type'
# prd
curl -sI "http://localhost:${FRONTEND_HOST_PORT:-9080}/" | grep -iE 'content-security-policy|x-frame-options|x-content-type'
```

In dev, Caddy forwards `X-Forwarded-For` / `X-Real-IP` to the API for rate limiting. In prd, configure host nginx to do the same.

---

## Handoff modes

Cross-device script transfer (ADR 006). Fallback order in the UI: **single QR → multi-QR → LAN → relay**.

| Mode | When | Server stores script? |
|------|------|------------------------|
| **Single QR** | Compressed payload fits one QR URL at `PUBLIC_ORIGIN` | No — `#tp=v1.*` fragment only |
| **Multi-QR** | Over single-QR limit but chunkable into N QR URLs | No — phone reassembles in browser |
| **LAN one-shot** | Same Wi‑Fi / hotspot; multi-QR unavailable or impractical | Yes — in-memory API map 120s, single GET, **no Redis** |
| **Relay + OTP** | Over 256 KB or last resort | Yes — Redis TTL 300s, delete-on-read |

### QR size limits (D14)

Two limits apply; do not conflate them:

| Limit | Value | Purpose |
|-------|-------|---------|
| **Fragment threshold** | 8192 B compressed (`QR_FRAGMENT_THRESHOLD_BYTES`) | Fast mode heuristic (U8) |
| **QR encode capacity** | 3360 URL chars (`QR_MAX_URL_CHARS`, EC-M measured) | Hard cap for `qrcode` library |

A script can pass the 8192 B check yet fail QR generation when the full URL exceeds 3360 chars (common with long hotspot hostnames). The UI then falls back to multi-QR, LAN, or relay.

**Hotspot / LAN:** Set in `.env.dev` or `.env.prd`:

- `PUBLIC_ORIGIN=http://<host>:<frontend-port>` — QR and SPA handoff links
- `API_PUBLIC_BASE_URL=http://<host>:<api-port>` — LAN API claim URLs

Restart after changes: `bin/start.sh dev restart` or `bin/start.sh prd restart`. The handoff page shows **Handoff link host** — confirm it shows your public host before scanning.

The API exposes `GET /api/v1/handoff/public-config` (`spa_public_origin`) so QR links stay correct even when the browser is opened via LAN IP while env vars were stale. If you open the app at `http://localhost:…`, QR generation is blocked with an error — use `http://<laptop-ip>:9080` instead.

Constants live in `frontend/src/pairing/qrConstants.ts`.

---

## Operations

### Restart

```bash
bin/start.sh dev restart
bin/start.sh prd restart
```

### View logs

```bash
bin/start.sh dev logs:api
bin/start.sh dev logs:caddy
bin/start.sh prd logs:api
bin/start.sh prd logs:frontend
```

### Redis flush (abuse recovery)

Relay data is ephemeral. To clear all sessions:

```bash
docker compose --project-directory deploy -f deploy/docker-compose.dev.yml exec redis redis-cli FLUSHDB
```

**Impact:** in-flight relay handoffs fail; QR handoffs unaffected.

### Rollback

- Redeploy previous image/tag via compose
- QR disabled → relay-only fallback is built into the UI (scripts over threshold auto-use relay)
- CSP can revert to report-only by editing `deploy/Caddyfile.dev` (dev) or `frontend/nginx.prd.conf` (prd) if a false positive blocks assets

---

## CI reference

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests for API + frontend in containers. Playwright E2E runs locally via:

```bash
bin/e2e-offline.sh
docker compose --project-directory deploy -f deploy/docker-compose.dev.yml exec frontend sh -c "cd /app && npx playwright test handoff"
```

---

## Production stack

The dev compose file (`deploy/docker-compose.dev.yml`) proxies all HTML traffic to the **Vite dev server** (`frontend:5173`). This is convenient for local development and LAN/hotspot demos, but it is **not suitable for production**: the dev server is unoptimized, can crash/exit, and requires a live Node container.

For production-like or public deployments, use the dedicated production compose file:

```bash
cp .env.example .env.prd
# edit .env.prd: STACK_ENV=prd, COMPOSE_PROJECT_NAME=tools-teleprompt-prd,
#                FRONTEND_HOST_PORT, API_DEV_PORT, API_OTP_HMAC_SECRET,
#                API_PUBLIC_BASE_URL, PUBLIC_ORIGIN, etc.
./bin/start.sh prd start
```

`deploy/docker-compose.prd.yml` uses:

- `api/Dockerfile.prd` — production API image (no reload, no dev deps)
- `frontend/Dockerfile.prd` — static build served by nginx on port 80
- `frontend/nginx.prd.conf` — SPA routing + security headers

There is **no Caddy container in prd**. The host nginx is expected to:

- Proxy `/api/*` and `/health` to `localhost:${API_DEV_PORT:-8000}`
- Proxy everything else to `localhost:${FRONTEND_HOST_PORT:-9080}`
- Terminate TLS and forward `X-Forwarded-For` / `X-Real-IP`

The production frontend is built with `VITE_API_BASE_URL` from `.env.prd`; leave it empty to have the browser use the same origin.

Example host nginx location blocks:

```nginx
location /health {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location / {
    proxy_pass http://127.0.0.1:9080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Production checklist

For the live `teleprompt.aiepic.app` host, prefer the checklist in `credentials/setup-full.md` (gitignored).

- [ ] `API_OTP_HMAC_SECRET` set to a strong random value (≥32 bytes)
- [ ] Host nginx configured to proxy `/api/*` and `/health` to API, all other paths to frontend
- [ ] TLS enabled at host nginx or upstream terminator (Cloudflare Full strict + Origin cert)
- [ ] CSP headers verified with `curl -I`
- [ ] Rate limits appropriate for expected traffic
- [ ] Frontend is served from the production static image, not the Vite dev server
- [ ] Optional: Lighthouse PWA audit (W6)

---

## Support paths

- Operator onboarding: `.work/plans/operations/20260520-sandbox-onboarding.md`
- Architecture: `.work/plans/foundation/20260520-04-foundation-architecture.md`
- Session handoff: `.work/context/HANDOFF.md`
