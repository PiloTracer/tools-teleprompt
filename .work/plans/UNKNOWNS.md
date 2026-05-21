# UNKNOWNS - planning registry

**Updated:** 2026-05-21 · **Maintained by:** plan-foundation / plan-master

| ID | Question / blocker | Blocks | Owner | Status |
|----|-------------------|--------|-------|--------|
| U1 | Default max document size — **256 KB** | API limits, UX | owner | **Resolved** 2026-05-21 — `API_MAX_SCRIPT_BYTES=262144`, `frontend/src/prompter/limits.ts` |
| U2 | Plain vs markdown in v1 | Parser, XSS | owner | **Resolved** — both; markdown → sanitized HTML |
| U3 | Redis vs in-memory for relay | P5 compose | eng | **Resolved** — Redis 7 (ADR 002) |
| U4 | PWA offline in v1 | Service worker | owner | **Resolved** — required in v1 |
| U5 | Primary stack pins (`DOCS_TECH_STACK.md`) | P2 ADRs, P4 | owner | **Resolved** — pinned 2026-05-20 |
| U6 | CI platform choice | Pipeline | eng | **Resolved** 2026-05-21 — GitHub Actions (`.github/workflows/ci.yml`; plan D7) |
| U7 | QR handoff in v1 vs v1.1 | Handoff UX | owner | **Resolved** — required in v1 |
| U8 | Exact QR fragment size threshold (bytes) | QR UX | eng | **Resolved** 2026-05-21 — 8192 bytes compressed in `frontend/src/pairing/qrThreshold.ts` (plan D8) |
| U9 | Serverless path for **large** cross-device scripts (v2) | FR-11/12, M7 | owner | **Resolved** 2026-05-21 — M7 approved: LAN + multi-QR (ADR 006) |

## Review log

| Date | Reviewer | Action |
|------|----------|--------|
| 2026-05-20 | plan-foundation P0 | Initial |
| 2026-05-20 | plan-foundation P4 | Closed U5 (stack pins) |
| 2026-05-21 | M6-T8 | Closed U1, U6, U8 with plan defaults |
| 2026-05-21 | plan-master revise | Opened U9 — serverless large handoff v2 options |
| 2026-05-21 | owner | Closed U9 — M7 (LAN + multi-QR) approved; ADR 006 |
