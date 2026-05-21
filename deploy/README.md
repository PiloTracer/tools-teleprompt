# Production deployment — tools-teleprompt

**Stack:** Caddy (reverse proxy) · Vite static frontend · FastAPI pairing API · Redis 7 (ephemeral relay)

---

## Prerequisites

- Docker Engine 24+ with Compose v2
- Host port available (default **9080** via `CADDY_HOST_PORT`; frontend dev/HMR **9173** via `FRONTEND_HOST_PORT`)
- TLS certificate (production) — terminate at Caddy or upstream load balancer

---

## Quick start (single VPS)

1. Clone the repository and copy environment template:

   ```bash
   cp .env.example .env
   ```

2. Set production values in `.env` (see **Environment variables** below).

3. Start the stack:

   ```bash
   bin/start.sh dev start
   # or interactive menu: bin/start.sh dev
   ```

4. Verify health:

   ```bash
   curl -sS "http://localhost:${CADDY_HOST_PORT:-9080}/health"
   ```

   Expect HTTP 200 with JSON body indicating API + Redis reachable.

5. Open the app at `http://localhost:${CADDY_HOST_PORT:-9080}/`.

Direct Vite dev + HMR WebSocket (optional): `http://localhost:${FRONTEND_HOST_PORT:-9173}/`.

---

## Environment variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `STACK_NAME` | no | `tools-teleprompt` | Base name for containers/volumes |
| `STACK_ENV` | no | `dev` | Environment suffix (`-dev`, `-staging`, …) |
| `COMPOSE_PROJECT_NAME` | no | `${STACK_NAME}-${STACK_ENV}` | Compose project prefix |
| `PUBLIC_HOST` | no | `localhost` | Hostname in URL hints |
| `CADDY_HOST_PORT` | no | `9080` | Host port → Caddy :80 (primary app URL) |
| `FRONTEND_HOST_PORT` | no | `9173` | Host port → Vite dev + HMR WebSocket |
| `FRONTEND_DEV_PORT` | no | `5173` | Vite listen port inside container |
| `API_DEV_PORT` | no | `8000` | API listen port inside container |
| `API_MAX_SCRIPT_BYTES` | no | `262144` | Max relay script size (256 KB) |
| `API_SESSION_TTL_SECONDS` | no | `300` | Relay TTL (5 min) |
| `API_RATE_LIMIT_CREATE` | no | `10` | Creates per IP per window |
| `API_RATE_LIMIT_CLAIM` | no | `20` | Claims per IP per window |
| `API_OTP_HMAC_SECRET` | **yes (prod)** | dev placeholder | Rotate before production; never commit |
| `REDIS_URL` | no | `redis://redis:6379/0` | Internal compose network |
| `VITE_API_BASE_URL` | build-time | empty (same-origin) | Set to public URL if API on different origin |

---

## Security headers (Caddy)

`deploy/Caddyfile` sets CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` on all responses. Cross-check: `.ai/standards/20260520-threat-model.md`.

Verify after deploy:

```bash
curl -sI "http://localhost:${CADDY_HOST_PORT:-9080}/" | grep -iE 'content-security-policy|x-frame-options|x-content-type'
```

Caddy forwards `X-Forwarded-For` / `X-Real-IP` to the API for rate limiting.

---

## Handoff modes

| Mode | When | Server stores script? |
|------|------|------------------------|
| **QR fragment** | Script ≤ 8192 B compressed | No — payload in URL `#fragment` only |
| **Relay + OTP** | Script over QR threshold | Yes — Redis TTL 300s, delete-on-read |

---

## Operations

### Restart

```bash
bin/start.sh dev restart
```

### View logs

```bash
bin/start.sh dev logs:api
bin/start.sh dev logs:caddy
```

### Redis flush (abuse recovery)

Relay data is ephemeral. To clear all sessions:

```bash
docker compose -f deploy/docker-compose.yml exec redis redis-cli FLUSHDB
```

**Impact:** in-flight relay handoffs fail; QR handoffs unaffected.

### Rollback

- Redeploy previous image/tag via compose
- QR disabled → relay-only fallback is built into the UI (scripts over threshold auto-use relay)
- CSP can revert to report-only by editing `deploy/Caddyfile` if a false positive blocks assets

---

## CI reference

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests for API + frontend in containers. Playwright E2E runs locally via:

```bash
bin/e2e-offline.sh
docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npx playwright test handoff"
```

---

## Production checklist

- [ ] `API_OTP_HMAC_SECRET` set to a strong random value (≥32 bytes)
- [ ] TLS enabled (Caddy auto HTTPS or upstream terminator)
- [ ] CSP headers verified with `curl -I`
- [ ] Rate limits appropriate for expected traffic
- [ ] Optional: Lighthouse PWA audit (W6)

---

## Support paths

- Operator onboarding: `.work/plans/operations/20260520-sandbox-onboarding.md`
- Architecture: `.work/plans/foundation/20260520-04-foundation-architecture.md`
- Session handoff: `.work/context/HANDOFF.md`
