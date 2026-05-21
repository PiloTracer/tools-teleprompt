# RISK_REGISTRY - planning registry

**Updated:** 2026-05-20 · **Maintained by:** plan-foundation / plan-master

Status: **Open** | **Mitigated** | **Accepted** | **Closed**

| ID | Risk | Category | Likelihood | Impact | Mitigation | Status | Owner |
|----|------|----------|------------|--------|------------|--------|-------|
| R1 | Scope creep before foundation complete | process | M | M | plan-foundation gates; no broad coding until implementation-ready | Open | eng |
| R2 | Agent marks gate pass without evidence | process / agent | M | M | `.cursorrules` Completion Gate; code-verify | Mitigated | eng |
| R3 | Secrets committed to git | security | L | H | `.cursorrules` secrets scan; pre-commit | Open | eng |
| R4 | Script leaked via guessable or shared magic URL | security | M | H | High-entropy token, OTP, TTL, single claim, delete-on-read | Open | eng |
| R5 | Abuse of session-create (spam, memory exhaustion) | security / ops | M | M | Rate limits, max size, per-IP caps, no disk files | Open | eng |
| R6 | XSS via markdown/HTML in teleprompter | security | M | H | markdown → HTML → DOMPurify; strict CSP; SPEC rules | Open | eng |
| R7 | localStorage quota exceeded on mobile | technical | M | M | Size cap, IndexedDB fallback, clear UX | Open | eng |
| R8 | Multi-instance API without shared ephemeral store | ops | L | M | Redis for relay or single replica v1 | Open | eng |
| R9 | QR fragment exceeds URL/QR capacity | technical | M | M | Auto-fallback to relay; U8 threshold | Open | eng |
| R10 | Stale service worker serves broken offline shell | technical | L | M | SW update strategy; PWA update UX in SPEC | Open | eng |
| R11 | Compose misconfiguration exposes Redis publicly | security | L | H | Internal network only; proposal §2 | Mitigated | eng |

## Review log

| Date | Reviewer | Action |
|------|----------|--------|
| 2026-05-20 | plan-foundation P0 | Initial product risks |
| 2026-05-20 | plan-foundation P5 | R11 compose exposure; deploy/rollback in proposal |
