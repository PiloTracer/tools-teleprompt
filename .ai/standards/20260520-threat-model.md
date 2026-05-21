# Threat Model — tools-teleprompt

**Status:** v1 foundation (P4)  
**Pairs with:** `20260520-data-classification.md`, feature SPECs, ADRs 002, 005

---

## 1. Assets

| Id | Asset | Impact if lost or tampered |
|----|-------|----------------------------|
| A1 | User script content | Privacy breach; presenter embarrassment |
| A2 | Pairing session token + OTP | Unauthorized script retrieval |
| A3 | Redis relay payload (≤5 min) | Same as A1, temporary |
| A4 | Operator TLS keys / host | Service impersonation |
| A5 | Dependency supply chain | XSS, backdoor |

**Not in scope v1:** user PII database, payment data, long-term credentials.

---

## 2. Trust boundaries

```text
[Browser A — desktop]  ──TLS──▶  [Caddy] ──▶ [Static frontend]
                                      │
[Browser B — mobile]   ──TLS──▶       ├──▶ [FastAPI pairing-api] ──▶ [Redis internal]
                                      │
QR fragment (#payload) ──(never hits server logs)──▶ [Browser B localStorage]
```

| Boundary | Data crossing | Controls |
|----------|---------------|----------|
| Browser ↔ CDN/static | Public JS/CSS | SRI optional; CSP |
| Browser ↔ API | Script text (relay only), OTP | TLS, size limit, rate limit, TTL |
| API ↔ Redis | Script text, otp_hash | Internal network, TTL, delete-on-read |
| Markdown → DOM | HTML | ADR 005 sanitize pipeline |

---

## 3. STRIDE (pairing + UI)

| Threat | Mitigation |
|--------|------------|
| Spoofing | No user auth; pairing requires token + OTP |
| Tampering | HTTPS; constant-time OTP compare |
| Repudiation | Structured logs with correlation id (no script body) |
| Information disclosure | Delete-on-read; no script in logs; QR in fragment not server |
| Denial of service | Rate limits, max body size, Redis memory cap |
| Elevation | No RBAC; single public instance (ADR 004) |

---

## 4. High-risk modules (≥2 reviewers recommended)

- `pairing-api` — session create/claim
- `markdown-render` — XSS surface
- `frontend/src/pwa/` — service worker cache poisoning (scope changes)

---

## 5. Supply chain

- Lockfiles: `frontend/package-lock.json`, `api/uv.lock` or pinned requirements
- `npm audit` / `pip audit` in CI when U6 resolved
- No secrets in repo

---

## 6. Incident response

- v1: operator rotates TLS, redeploys compose, flushes Redis if abuse
- Runbook path: `.work/plans/operations/` (P6 README)

---

## 7. Review cadence

Revisit on: new auth, durable storage, file uploads to disk, or third-party analytics.
