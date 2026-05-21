# Observability Specification — tools-teleprompt

**Status:** v1 foundation (P4)  
**Metric prefix:** `teleprompt_`

---

## 1. Principles

- Correlation id: `X-Correlation-Id` on API requests (UUID v4).
- No script text, OTP, or tokens in logs, metrics labels, or spans.
- Frontend metrics optional (console/debug only v1); API metrics required.

---

## 2. Metrics (API)

| Name | Type | Labels |
|------|------|--------|
| `teleprompt_http_request_total` | Counter | `method`, `route`, `status_class` |
| `teleprompt_http_request_seconds` | Histogram | `method`, `route` |
| `teleprompt_pairing_session_created_total` | Counter | — |
| `teleprompt_pairing_session_claimed_total` | Counter | `outcome=success\|invalid_otp\|expired\|locked` |
| `teleprompt_pairing_session_expired_total` | Counter | — |
| `teleprompt_redis_operation_seconds` | Histogram | `op=get\|set\|del` |

---

## 3. Tracing

- OpenTelemetry optional v1; minimum: correlation id in JSON logs.
- Span names: `HTTP POST /api/v1/sessions`, not raw tokens.

---

## 4. Logging (API)

Required fields: `timestamp`, `level`, `message`, `correlation_id`, `service=api`, `event`.

Example events: `pairing.session.created`, `pairing.session.claimed`, `pairing.session.locked`.

---

## 5. Dashboards and alerts (starter)

| Signal | Alert |
|--------|-------|
| 5xx rate | > 1% for 5m |
| claim `invalid_otp` spike | > 100/15m per IP (abuse) |
| Redis unreachable | health check fails |

---

## 6. Frontend (optional v1)

- No third-party analytics with script content.
- Performance: measure long tasks in dev only.

---

## 7. Cross-reference

Feature SPECs §9: `pairing-api`, `prompter-ui` optional client events.
