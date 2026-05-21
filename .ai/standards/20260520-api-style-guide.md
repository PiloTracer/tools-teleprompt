# API Style Guide — tools-teleprompt

**Status:** v1 foundation (P4) — binding for `pairing-api`

---

## 1. Base URL and versioning

| Env | Base |
|-----|------|
| local | `http://localhost:8080/api/v1` |
| production | `https://{host}/api/v1` |

- Version in path only. Breaking changes → `/api/v2` + ADR.

---

## 2. Authentication and context

- **No user authentication** v1 (ADR 004).
- Pairing routes are **anonymous**; capability = `token` + `otp` on claim.
- **No tenant header.**

| Header | Required | Notes |
|--------|----------|-------|
| `Content-Type` | POST | `application/json` |
| `X-Correlation-Id` | Optional | Server generates if absent; echoed on response |

---

## 3. Resource naming

| Resource | Path |
|----------|------|
| Sessions | `/sessions`, `/sessions/{token}/claim` |
| Health | `/health` (outside `/api/v1` or at root — pick one in impl; document in OpenAPI) |

- `token`: URL-safe base64url, 22+ chars
- No plural verbs in paths

---

## 4. Request and response bodies

- JSON UTF-8
- Field names: `snake_case`
- Timestamps: ISO-8601 UTC with `Z`

**Create session:**

```json
{ "text": "...", "format": "plain" }
```

`format` optional; default `plain`.

**Create response (201):**

```json
{
  "token": "...",
  "otp": "123456",
  "claim_url": "https://host/pair/{token}",
  "expires_at": "2026-05-20T12:00:00Z"
}
```

**Claim response (200):**

```json
{ "text": "...", "format": "markdown" }
```

---

## 5. Errors

RFC 7807 Problem Details (`application/problem+json`):

```json
{
  "type": "https://tools-teleprompt/errors/payload-too-large",
  "title": "Payload Too Large",
  "status": 413,
  "detail": "Script exceeds maximum size"
}
```

| Status | When |
|--------|------|
| 400 | Malformed JSON, invalid format enum |
| 404 | Unknown or expired token |
| 410 | Already claimed |
| 413 | Body too large |
| 423 | OTP attempts exhausted |
| 429 | Rate limited |

Never include script excerpts in `detail`.

---

## 6. Idempotency

- Create is **not** idempotent (new session each POST).
- Claim is idempotent only in failure replay sense; success deletes session (410 on retry).

---

## 7. CORS

- Same-origin preferred for production (frontend served from same host via Caddy).
- If split origins in dev: allow `localhost` ports explicitly.

---

## 8. OpenAPI

- Generate from FastAPI at `/openapi.json` v1.
- Publish snapshot in repo when API stabilizes (P6 optional).

---

## 9. Cross-reference

- CONVENTIONS §6 errors
- `pairing-api` SPEC §6
