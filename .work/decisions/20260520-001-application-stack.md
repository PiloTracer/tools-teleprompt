# ADR 001 - Application stack (frontend, API, client libraries)

**Status:** Decided · 2026-05-20  
**Owner:** eng  
**Supersedes:** -

## Context

tools-teleprompt is a 100% web teleprompter with PWA offline, markdown rendering, QR handoff, and a small pairing API. v1 requires no database and no user accounts. Foundation doc 04 proposed a split SPA + minimal API. We need pinned choices for implementation and SPECs.

**Business goals traced:** simple, cross-device, dockerized, device-first storage (foundation doc 01).

## Decision

We will use:

| Layer | Choice | Pin (initial) |
|-------|--------|---------------|
| Frontend | **React 19** + **Vite 6** + **TypeScript 5** | SPA, PWA via `vite-plugin-pwa` |
| Markdown | **markdown-it** + **DOMPurify** | CommonMark subset; no raw HTML in source |
| QR | **qrcode** (generate); camera / paste URL (consume) | Client-only handoff |
| Backend | **Python 3.12** + **FastAPI** | Pairing API + health only |
| HTTP server | **uvicorn** | ASGI |
| Testing | **vitest** (frontend), **pytest** (API) | Per doc 04 §10 |

UI language v1: **English only** (`en`); i18n structure deferred.

## Consequences

**Positive:**

- Strong ecosystem for PWA, markdown, and QR on the frontend
- FastAPI fits minimal relay API with async Redis client
- TypeScript + pytest/vitest align with task-gate testing

**Negative / trade-offs:**

- Two runtime images in compose (frontend static + API)
- Python + Node toolchains in dev (acceptable for split layout)

## Alternatives considered

| Option | Why not |
|--------|---------|
| Next.js | Heavier than needed for static teleprompter SPA |
| Node.js API | Acceptable; Python chosen for lean pairing service per doc 04 |
| SvelteKit | Less markdown/PWA examples in team defaults |
| Single Next.js full-stack | Over couples UI and pairing; owner wanted simple API surface |

## References

- `.work/plans/foundation/20260520-04-foundation-architecture.md` §6
- `.work/plans/foundation/20260520-01-tools-teleprompt-scope.md` FR-01–FR-10
