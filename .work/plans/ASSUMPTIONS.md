# ASSUMPTIONS - planning registry

**Updated:** 2026-05-20 · **Maintained by:** plan-foundation / plan-master

Label every entry: **Confirmed** | **Inference** | **Unverified** | **Rejected**

| ID | Assumption | Label | Source | Notes |
|----|------------|-------|--------|-------|
| A1 | Project name is **tools-teleprompt** | Confirmed | P0 owner | |
| A2 | v1 is 100% web, no user accounts, no database | Confirmed | foundation doc 01 | |
| A3 | Cross-device handoff uses ephemeral relay (≤5 min) for large scripts | Confirmed | doc 01/04 | QR for small scripts |
| A4 | Same-device workflow uses browser local storage only (no OTP) | Confirmed | doc 01 Flow A | |
| A5 | OTP + magic URL required only for relay cross-device path | Confirmed | doc 01 Flow B | |
| A6 | Primary users are solo presenters using phone/tablet as prompter | Inference | doc 01 | |
| A7 | Dev workflow follows `.cursorrules` (Docker when pinned in P5) | Confirmed | `.cursorrules` | REPLACE tokens until P2–P5 |
| A8 | No external vendor integrations in v1 | Confirmed | P1 scope | doc 02 skipped |
| A9 | v1 self-contained; no adjacency modules | Confirmed | P1 scope | doc 03 skipped |
| A10 | Default max script size 256 KB | Inference | P1 scope | U1 default; owner may override |
| A11 | v1 supports **plain text and markdown**; markdown displays as **sanitized HTML** in prompter | Confirmed | owner P1 revision | |
| A12 | **PWA offline** (service worker + offline prompter) in v1 | Confirmed | owner P1 revision | |
| A13 | **QR fragment handoff** in v1 for scripts ≤ ~8 KB compressed | Confirmed | owner P1 revision | threshold U8 |
| A14 | Application stack: React 19 + Vite 6 + TS, FastAPI, markdown-it + DOMPurify | Confirmed | ADR 001 | |
| A15 | Redis 7 for ephemeral pairing relay only | Confirmed | ADR 002 | |
| A16 | Deploy via Docker Compose on VPS/container host | Confirmed | ADR 003 | |
| A17 | Single public instance; no accounts or multi-tenancy | Confirmed | ADR 004 | |
| A18 | Markdown → DOMPurify-sanitized HTML in prompter | Confirmed | ADR 005 | |
| A19 | UI language v1: English only | Confirmed | ADR 001 | |

## Rejected

| ID | Assumption | Reason |
|----|------------|--------|
| A-R1 | Durable server-side script library in v1 | Privacy / no DB |
| A-R2 | Plain text only in v1 (no markdown) | Superseded by owner decision |

## Review log

| Date | Reviewer | Action |
|------|----------|--------|
| 2026-05-20 | plan-foundation P0 | Initial capture |
| 2026-05-20 | plan-foundation certify | plan-master-ready: pass with waivers |
