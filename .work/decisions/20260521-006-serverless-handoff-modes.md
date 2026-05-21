# ADR 006 — Serverless large-script handoff (LAN + multi-QR)

**Status:** Decided · 2026-05-21  
**Owner:** owner / eng  
**Supersedes:** none (extends ADR 002 relay + v1 QR)

## Context

v1 cross-device handoff:

- **QR fragment** — serverless, size capped by QR symbol capacity (~3.3k URL chars measured).
- **Redis relay** — up to 256 KB, delete-on-read, TTL 300s.

Owner approved **M7** (2026-05-21) to add **serverless paths for larger scripts** without Redis persistence (U9).

## Decision

Add two v2 handoff modes; **keep v1 relay and single-QR unchanged**.

### 1. LAN one-shot handoff (FR-11)

- Desktop calls **`POST /api/v1/handoff/lan`** with `{ text, format }`.
- API stores payload in an **in-process memory map** (not Redis), keyed by CSPRNG token, TTL **120s**, max **one GET**.
- Response includes claim URL using `PUBLIC_ORIGIN` / `API_PUBLIC_BASE_URL` (e.g. `http://10.42.0.1:9080/api/v1/handoff/lan/{token}` or dedicated path proxied by Caddy).
- Phone **`GET`** once → script JSON → **immediate delete** from memory map.
- Second GET → **410 Gone**.
- Same size limit as relay (**256 KB**).
- **No Redis write**; lost on API process restart (acceptable for LAN/hotspot UX).
- Rate limit per IP on create (reuse pairing rate limiter).

### 2. Multi-QR sequence (FR-12)

- Client splits compressed payload into chunks; each chunk encodes to a QR scannable in sequence.
- Payload reassembled **entirely on phone**; **no API call** for script body.
- UX: “Scan code 1 of N” with prev/next/regenerate on desktop.
- Total size capped by **256 KB** raw script (same as relay); per-chunk QR must fit `QR_MAX_URL_CHARS`.
- Fallback order in UI: single QR → multi-QR (if over single QR) → LAN → relay.

### Deferred

- **WebRTC P2P** (foundation option C) — v2.1+; separate ADR when signaling design exists.

## Consequences

**Positive:**

- Large scripts on same LAN/hotspot without Redis relay session.
- Multi-QR works without any server body transfer.
- Privacy posture preserved (no script in logs; LAN map not persisted).

**Negative / trade-offs:**

- LAN mode still uses **ephemeral API RAM** (not “zero server touch”); clearer than Redis for hotspot operators.
- Multi-QR UX is slower (N scans).
- In-process LAN store **not shared across API replicas** — v1 single-instance VPS only (consistent with NFR-06).

## Alternatives considered

| Option | Why not (for M7) |
|--------|------------------|
| Redis relay with encryption | Still server retention |
| WebRTC | Complexity, NAT; deferred |
| Filesystem upload | Durable leak risk |
| Larger single QR | Exceeds symbol capacity |

## References

- `.work/plans/20260521-revise-serverless-large-handoff.md`
- `.work/plans/full/20260521-full-plan.md` § M7
- `.work/decisions/20260520-002-ephemeral-redis-store.md`
- FR-11, FR-12, NFR-11
