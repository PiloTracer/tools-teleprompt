# ADR 005 - Markdown render and HTML sanitization policy

**Status:** Decided · 2026-05-20  
**Owner:** eng  
**Supersedes:** -

## Context

v1 must support plain text and markdown; markdown teleprompter output is **HTML-formatted**. User scripts may contain hostile content. R6 tracks XSS risk.

## Decision

**Pipeline (mandatory order):**

1. Store **source** (`plain` | `markdown`) in client local storage and relay API
2. Parse markdown with **markdown-it**, options:
   - `html: false` (no raw HTML in markdown source)
   - `linkify: true` with `rel="noopener noreferrer"` on links
3. Sanitize HTML output with **DOMPurify** using a **strict allowlist**:
   - Block: `script`, `iframe`, `object`, `embed`, event handlers, `javascript:` URLs
   - Allow: `p`, `br`, `strong`, `em`, `u`, `h1`–`h6`, `ul`, `ol`, `li`, `a`, `code`, `pre`, `blockquote`, `hr`
4. Render in React via sanitized HTML binding only after step 3; **never** skip sanitization
5. Plain text: escape and render in `<pre>` or text container — no HTML parse

**CSP (production baseline, detailed in P4):** `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` (minimize inline over time).

**Tests:** vitest fixtures with XSS payloads must not execute scripts post-render.

## Consequences

**Positive:**

- Owner requirement met (markdown → HTML display)
- Defense in depth vs XSS

**Negative / trade-offs:**

- Subset of markdown features (no raw HTML blocks)
- `unsafe-inline` styles may remain for teleprompter theming until refactored

## Alternatives considered

| Option | Why not |
|--------|---------|
| Plain text only | Rejected by owner P1 revision |
| unsanitized marked output | Unacceptable XSS risk |
| Custom markdown subset parser | Reinventing; markdown-it + DOMPurify is standard |

## References

- `.work/plans/foundation/20260520-01-tools-teleprompt-scope.md` FR-02, C4
- `.work/plans/foundation/20260520-04-foundation-architecture.md` §3b
- RISK_REGISTRY R6
