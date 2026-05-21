# ADR 002 - Ephemeral session store (Redis)

**Status:** Decided · 2026-05-20  
**Owner:** eng  
**Supersedes:** -

## Context

Cross-device relay (Flow B) requires temporary storage of script text server-side for up to ~5 minutes, with delete-on-read after OTP claim. v1 explicitly excludes a SQL/NoSQL database. Multi-container deploys need a shared store if API replicas > 1.

**Business goals traced:** cross-device convenience without durable server script library (doc 01 § Storage).

## Decision

We will use **Redis 7** as the **only** server-side data store for pairing sessions:

- Keys: session token → `{ otp_hash, script_text, format, expires_at, attempt_count }`
- TTL: **300 seconds** (5 minutes) on every key
- **Delete key immediately** on successful claim
- **No persistence** required (AOF/RDB optional off for relay-only use; document if enabled)
- Local dev: Redis container in Docker Compose
- Tests: **fakeredis** or testcontainer for integration tests

In-memory dict is **not** used for production (breaks multi-instance); acceptable only in unit tests.

## Consequences

**Positive:**

- Native TTL and delete-on-read semantics
- Shared store if API scaled horizontally
- No schema migrations

**Negative / trade-offs:**

- Additional container in compose
- Memory-bound; mitigated by max script size (256 KB) and rate limits

## Alternatives considered

| Option | Why not |
|--------|---------|
| In-process memory | Lost on restart; not shared across replicas |
| PostgreSQL | Owner excluded database for v1 |
| Filesystem temp dir | Durable leak risk; harder to TTL uniformly |
| WebRTC only | Does not cover large scripts; QR already covers small |

## References

- `.work/plans/foundation/20260520-04-foundation-architecture.md` §2, §4
- `.work/plans/foundation/20260520-01-tools-teleprompt-initial-scope.md` Flow B
- RISK_REGISTRY R8
