# MOD-06 / W3 — M7 Serverless handoff (LAN + multi-QR) security review

**Date:** 2026-05-21  
**Iteration:** M7 · LAN one-shot + multi-QR + mode router  
**Reviewer:** implementation agent (W3 formal scope for M7-T9)

## AI change risk summary

- AI-assisted: yes
- Boundaries crossed: 2 — `api/src/pairing/` (LAN store) + `frontend/src/pairing/` (multi-QR, LAN UI, mode router)
- New cross-boundary deps: FE `client.ts` → LAN API; multi-QR remains client-only; mode router calls both paths
- Test isolation: ok — `pytest tests/pairing/test_lan.py` (17 pairing API tests total `measured`); vitest pairing (7) + publicOrigin (6); Playwright handoff specs (5 `measured`)
- Human architectural review: optional — ADR 006 approved; in-memory LAN store scoped to single replica per NFR-06
- Blast radius: LAN token leak on shared LAN (R12) mitigated by 120s TTL, single GET, rate-limited POST, tombstone 410. Multi-QR malformed fragments rejected in `qrChunkDecode.ts`; no script in API logs (NFR-11). Wrong mode selection falls back to relay; oversize blocked at 256 KB. LAN store lost on API restart (acceptable). Multi-instance LAN not supported (documented).

## LAN handoff (FR-11)

| Area | Finding | Severity | Mitigation |
|------|---------|----------|------------|
| Script in API RAM | Ephemeral 120s, delete-on-read | ok | ADR 006; no Redis key (I3) |
| Token in logs | Event type only | ok | `test_lan.py` log capture |
| Second GET | 410 Gone | ok | tombstone map |
| Rate limit | Shared create bucket | ok | same as relay create |
| SPA vs API URL | Phone uses `/handoff/lan/{token}` | ok | `lanHandoffPageUrl()` |
| Cross-replica | Not shared | Low | single VPS v1; documented in amendment |

## Multi-QR handoff (FR-12)

| Area | Finding | Severity | Mitigation |
|------|---------|----------|------------|
| Chunk reassembly | sessionStorage only; cleared on success | ok | `qrChunkDecode.ts` |
| Out-of-order / missing chunk | Pending UX; decode fails safely | ok | vitest + E2E |
| Total size | 256 KB cap (same as relay) | ok | `validateScriptSize` |
| API body transfer | Zero on consume path | ok | E2E network audit |
| XSS via fragment | Decode → validate → storage; no `innerHTML` of raw fragment | ok | same pipeline as single QR |

## Mode router + D14

| Area | Finding | Severity | Mitigation |
|------|---------|----------|------------|
| Fallback order | single → multi → LAN → relay | ok | `resolveHandoffMode()` |
| QR false negative | URL length check before generate | ok | `qrConstants.ts` D14 docs |
| Compression unavailable | Falls back to LAN | ok | E2E LAN test stubs CompressionStream |

## Recommendation

merge_with_conditions — reason: ADR 006 controls implemented; NFR-11 satisfied on LAN path; multi-QR adds no new server persistence.

## Conditions

- `@code-verify milestone` pass before `@code-implementation complete`
- Hotspot operators set `PUBLIC_ORIGIN` / `API_PUBLIC_BASE_URL` (documented M7-T8)
- Optional: manual phone test on hotspot IP (U9 resolved via env docs)
