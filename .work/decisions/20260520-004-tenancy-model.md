# ADR 004 - Tenancy and identity model

**Status:** Decided · 2026-05-20  
**Owner:** eng  
**Supersedes:** -

## Context

Owner excluded user management, accounts, and database. Scripts live on client devices after use. The pairing API is anonymous. We must still define “tenancy” for threat model and deployment docs.

## Decision

We will use a **single public instance** model:

- **No multi-tenancy** — no tenant id, no schema-per-tenant, no row-level security
- **No user identity** — no registration, login, or sessions tied to people
- **Capability-based access** for relay only: unguessable token + OTP for a specific pairing session
- **Data isolation** is per **browser device** (localStorage / IndexedDB), not per server tenant

Each deployment is one independent instance (e.g. one compose stack per host). Multiple deployments are operator choice, not product multi-tenancy.

## Consequences

**Positive:**

- Minimal auth complexity
- Aligns with privacy goal (data on device)
- Simple threat model

**Negative / trade-offs:**

- No per-user quotas beyond IP rate limits
- Operators cannot offer “accounts” without new ADR

## Alternatives considered

| Option | Why not |
|--------|---------|
| schema-per-tenant SaaS | Owner: no user management |
| row-level multi-tenant | No DB in v1 |
| Shared cloud library per user | Conflicts with device-first storage |

## References

- `.work/plans/foundation/20260520-01-tools-teleprompt-scope.md` (out of scope: OAuth)
- `.work/plans/foundation/20260520-04-foundation-architecture.md` §1, §8
