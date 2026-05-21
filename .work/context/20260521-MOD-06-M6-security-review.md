# MOD-06 / W3 — M6 Markdown render + ADR 005 security review

**Date:** 2026-05-21  
**Iteration:** M6 · QR handoff, E2E, production hardening  
**Reviewer:** implementation agent (W3 formal scope for M6-T6)

## AI change risk summary

- AI-assisted: yes
- Boundaries crossed: 2 — `frontend/src/pairing/` (QR client-only) + `frontend/src/markdown/` (render path unchanged this iteration); CSP in `deploy/Caddyfile` (ops surface)
- New cross-boundary deps: QR consume writes to prompter storage only; no new server endpoints; E2E mocks API for relay path
- Test isolation: ok — markdown vitest corpus (`measured` 18/18); QR round-trip + consume vitest; Playwright handoff specs
- Human architectural review: optional — ADR 005 pipeline unchanged since M2; CSP aligns with threat-model baseline
- Blast radius: XSS via markdown remains primary R6 risk — mitigated by existing markdown-it `html: false` + DOMPurify allowlist + vitest XSS fixtures. QR fragment path adds client-only script transfer; malformed fragments rejected in `qrDecode.ts` without DOM execution. CSP `script-src 'self'` blocks injected third-party scripts.

## ADR 005 / markdown-render review

| Control | Status | Evidence |
|---------|--------|------------|
| markdown-it `html: false` | ok | `frontend/src/markdown/renderScript.ts` |
| DOMPurify strict allowlist | ok | `frontend/src/markdown/sanitize.ts` |
| Player uses `SanitizedHtml` only (R6) | ok | `Player.tsx`, M4 tests |
| XSS fixture corpus | ok | `tests/markdown.test.tsx` — script/onerror payloads stripped |
| Plain text escaped (R7) | ok | plain branch in render pipeline |
| CSP production baseline | ok | `deploy/Caddyfile` — `default-src 'self'`, `style-src 'unsafe-inline'` per ADR 005 trade-off |

## QR / handoff additions (M6)

| Area | Finding | Severity | Mitigation |
|------|---------|----------|------------|
| Fragment in URL hash | Not sent to server logs | ok | architecture + E2E network audit (0 API calls on QR path) |
| Fragment decode | Validates version, format, string shape | ok | `qrDecode.ts` + vitest |
| Oversize after decode | Client `validateScriptSize` blocks | ok | `QrConsume.tsx` |
| Console logging (I2) | No fragment payload logged | ok | code review — no `console.log` of payload |
| Relay E2E | Mocked API; real path covered by M5 pytest | ok | separation of concerns |

## Recommendation

merge_with_conditions — reason: ADR 005 controls intact; M6 adds QR client path and CSP without bypassing sanitization pipeline.

## Conditions

- Run full M6 gates before `@code-implementation complete`
- Production: verify CSP headers do not block required assets (`curl -I`)
- Optional: Lighthouse PWA audit (W6)
