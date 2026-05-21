# Code Conventions — tools-teleprompt

**Status:** Binding for application code (v1)  
**Project:** tools-teleprompt  
**Pairs with:** ADRs 001–005, `.work/plans/foundation/20260520-04-foundation-architecture.md`, `DOCS_TECH_STACK.md`

Generic lifecycle: `.ai/standards/20260517-FEATURE_STANDARD.md` (Agent OS template — do not edit).

---

## 1. Language and tooling baselines

| Surface | Tooling | Notes |
|---------|---------|-------|
| TypeScript (frontend) | ESLint, `tsc --noEmit`, vitest | Run in `frontend/` |
| Python 3.12 (API) | ruff, pyright, pytest | Run in `api/` |
| SQL | **N/A v1** | No database |
| Shell | bash `set -euo pipefail` | `deploy/` scripts only |

## 2. Type discipline

- TypeScript: `strict` enabled; no `any` in production paths without comment.
- Python: pyright strict on `api/src/`; Pydantic models at HTTP boundaries.

## 3. Naming

| Item | Convention |
|------|------------|
| TS/React components | `PascalCase` |
| TS functions, variables | `camelCase` |
| Python modules | `snake_case` |
| Python classes | `PascalCase` |
| HTTP routes | `kebab-case`, `/api/v1/...` prefix |
| Redis keys | `pairing:session:{token}` |
| Feature SPEC slugs | `kebab-case` under `.work/features/` |
| Env vars | `SCREAMING_SNAKE` with service prefix (`API_`, `REDIS_`) |

**Platform layer:** `api/src/platform/` — config, logging, rate limiting, Redis client factory.

## 4. Money and regulated fields

N/A for v1.

## 5. Time

- API: UTC ISO-8601 in JSON (`expires_at`).
- Client display: `Intl` / browser locale.

## 6. Errors

- API: RFC 7807 Problem Details (`application/problem+json`).
- Never include script body or OTP in error `detail`.

## 7. Logging and secrets

- Structured JSON logs in API.
- **Forbidden in logs:** script text, OTP, session token, QR fragment payload.
- Allowed: `event`, `session_id` (opaque internal id, not user token), `outcome`, `client_ip` (hashed optional).

## 8. Module boundaries

| Context | Path | May import |
|---------|------|------------|
| prompter-ui | `frontend/src/` | Shared TS utils only; no API internals |
| pairing-api | `api/src/pairing/` | `api/src/platform/` |
| platform | `api/src/platform/` | stdlib + redis + fastapi deps |

No imports from `frontend/` into `api/` or reverse.

## 9. Migrations

**N/A v1** — Redis only; no numbered SQL. If SQL added later, follow `.cursorrules` migration policy.

## 10. Performance budgets

| Route / use case | Budget |
|------------------|--------|
| `POST /api/v1/sessions` | 200 ms p95 (excl. network) |
| `POST .../claim` | 100 ms p95 |
| Teleprompter scroll | 60 fps target on mid-tier mobile |

## 11. Security coding rules

- Markdown HTML: **always** ADR 005 pipeline before DOM insert.
- Pairing: constant-time OTP compare; 128-bit tokens from `secrets`.
- Max body size enforced before Redis write.

## 12. Verification commands (canonical)

```bash
cd frontend && npm run lint && npm run typecheck && npm test
cd api && ruff check . && pyright . && pytest tests/ -q
```

Docker invocations pinned in P4/P5 `DOCS_TECH_STACK.md` and `.cursorrules`.
