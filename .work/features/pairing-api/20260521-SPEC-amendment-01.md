# Pairing API — SPEC Amendment 01 (LAN one-shot handoff)

**Status:** Approved  
**Amends:** `.work/features/pairing-api/20260520-SPEC.md`  
**ADR:** 006  
**Milestone:** M7-T6 · FR-11, NFR-11

---

## Summary

Adds **LAN one-shot handoff** endpoints. Relay sessions (Redis) unchanged. LAN payloads live in **process memory only** — not Redis, not durable.

---

## 2. In scope (additions)

- `POST /api/v1/handoff/lan` — create LAN handoff
- `GET /api/v1/handoff/lan/{token}` — deliver script once, delete from memory

---

## 3. Domain language (additions)

| Term | Definition |
|------|------------|
| LAN handoff | Ephemeral in-memory record; single GET delivery; no OTP |
| LAN token | Unguessable path segment (128-bit CSPRNG) |

---

## 4. Behavioural spec (additions)

- **R12.** `POST /api/v1/handoff/lan` accepts `{ "text", "format" }` with the same validation as R1 (UTF-8, max 256 KB).
- **R13.** Create returns `{ "token", "claim_url", "expires_at" }`; `claim_url` uses `API_PUBLIC_BASE_URL` (or configured public base); **no Redis write**.
- **R14.** LAN token entropy ≥ 128 bits; URL-safe encoding.
- **R15.** In-memory TTL = **120 seconds** from create; entry removed on successful GET or expiry sweep.
- **R16.** `GET /api/v1/handoff/lan/{token}` returns `{ "text", "format" }` once; entry **deleted immediately** after response.
- **R17.** Second GET on same token returns **410 Gone** (tombstone until TTL); unknown/expired token returns **404**.
- **R18.** Rate limit on LAN create reuses relay create limiter (R10 create bucket per IP).
- **R19.** Logs for LAN paths record event type only; never log `text`, full `token`, or URL fragments (extends R11).

---

## 5. Data model (additions)

**In-process map value (not Redis):**

```json
{
  "text": "...",
  "format": "plain|markdown",
  "expires_at": "ISO-8601"
}
```

Key pattern: internal map keyed by token. **Not** shared across API replicas (single-instance v1).

---

## 6. APIs (additions)

| Method | Path | Request | Success | Errors |
|--------|------|---------|---------|--------|
| POST | `/api/v1/handoff/lan` | `{ text, format? }` | 201 `{ token, claim_url, expires_at }` | 413, 429, 400 |
| GET | `/api/v1/handoff/lan/{token}` | — | 200 `{ text, format }` | 404, 410, 400 |

Problem Details (RFC 7807) unchanged.

---

## 7. Invariants (additions)

- **I3.** LAN handoff creates **zero** Redis keys (`pairing:session:*` unchanged).
- **I4.** At most one successful GET per LAN token.

---

## 9. Observability (additions)

| Event | Fields |
|-------|--------|
| `pairing.lan.created` | `outcome=success` |
| `pairing.lan.claimed` | `outcome=success\|fail`, `reason=` (no script/token) |

---

## 11. Test plan (additions)

| Rule | Test |
|------|------|
| R12–R16 | `tests/pairing/test_lan.py`: create, single GET, second GET 410, expiry 404 |
| R18 | rate limit 429 on create |
| R19 | log capture: no script/token in output |
| I3 | fakeredis: no `pairing:*` keys after LAN create |

---

## 12. Rollout and rollback

Deploy with existing `api` container. Rollback: hide LAN create in frontend; in-memory entries lost on process restart (acceptable).
