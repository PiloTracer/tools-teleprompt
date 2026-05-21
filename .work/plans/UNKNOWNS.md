# UNKNOWNS - planning registry

**Updated:** 2026-05-20 · **Maintained by:** plan-foundation / plan-master

| ID | Question / blocker | Blocks | Owner | Status |
|----|-------------------|--------|-------|--------|
| U1 | Default max document size — **256 KB proposed** | API limits, UX | owner | Open (default accepted pending explicit override) |
| U2 | Plain vs markdown in v1 | Parser, XSS | owner | **Resolved** — both; markdown → sanitized HTML |
| U3 | Redis vs in-memory for relay | P5 compose | eng | **Resolved** — Redis 7 (ADR 002) |
| U4 | PWA offline in v1 | Service worker | owner | **Resolved** — required in v1 |
| U5 | Primary stack pins (`DOCS_TECH_STACK.md`) | P2 ADRs, P4 | owner | **Resolved** — pinned 2026-05-20 |
| U6 | CI platform choice | Pipeline | eng | Open |
| U7 | QR handoff in v1 vs v1.1 | Handoff UX | owner | **Resolved** — required in v1 |
| U8 | Exact QR fragment size threshold (bytes) | QR UX | eng | Open — **8 KB compressed proposed** |

## Review log

| Date | Reviewer | Action |
|------|----------|--------|
| 2026-05-20 | plan-foundation P0 | Initial |
| 2026-05-20 | plan-foundation P4 | Closed U5 (stack pins) |
