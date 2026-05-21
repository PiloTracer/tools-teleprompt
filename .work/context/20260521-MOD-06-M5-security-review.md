# MOD-06 / W3 — M5 Pairing API security review

**Date:** 2026-05-21  
**Iteration:** M5 · pairing-api SPEC R1–R11 + relay handoff UI  
**Reviewer:** implementation agent (W3 formal scope for M5-T9)

## AI change risk summary

- AI-assisted: yes
- Boundaries crossed: 2 — `api/src/pairing/` + `api/src/tp_platform/` (platform helpers); `frontend/src/pairing/` → HTTP → pairing-api (MOD-01)
- New cross-boundary deps: frontend `fetch` to `/api/v1/sessions` and `/claim`; Redis TTL relay; no new third-party auth
- Test isolation: ok — API: `pytest tests/pairing/ -q` (`measured`); FE: `npm test -- pairing` (`measured`)
- Human architectural review: optional — reason: bounded ephemeral relay; delete-on-read verified in pytest + manual curl smoke; OTP lockout + rate limits covered
- Blast radius: If token/OTP handling wrong, scripts could leak via replay, brute force, or logs. Rate-limit bypass enables relay abuse (Redis/memory pressure). Frontend mis-wiring could skip OTP gate on wrong routes — mitigated by claim-only route using API. No SQL; Redis TTL bounds exposure window (300s).

## Security paths reviewed

| Area | Finding | Severity | Mitigation |
|------|---------|----------|------------|
| Token entropy (R4) | 128-bit `secrets.token_urlsafe(16)` | ok | pytest create + manual |
| OTP at rest (R2) | HMAC-SHA256 hash; plaintext only in create response | ok | log test R11 |
| Delete-on-read (R6) | Pipeline SET claimed + DEL session | ok | pytest second claim 410 |
| Lockout (R7) | 5 failures → 423 | ok | pytest lockout |
| Rate limits (R10) | Redis counters per IP / 15 min | ok | pytest 429 on 11th create |
| Log hygiene (R11) | Structured events only; caplog test | ok | pytest |
| Error bodies | RFC 7807; no script in `detail` | ok | manual 413/400 responses |
| FE claim flow | OTP required on `/handoff/claim/:token` | ok | vitest HandoffClaim |

## Recommendation

merge_with_conditions — reason: core relay security controls implemented and tested; QR path still out of scope (M6).

## Conditions if merge_with_conditions

- Complete `@code-implementation complete` with full API + FE gates
- M6: Playwright relay E2E + CSP deployment
- Production: rotate `API_OTP_HMAC_SECRET`; confirm Caddy forwards client IP for rate limits
- Optional: export Prometheus from in-process counters (currently test-only counters in `metrics.py`)
