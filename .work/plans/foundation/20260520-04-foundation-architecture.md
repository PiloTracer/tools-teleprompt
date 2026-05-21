# tools-teleprompt — Foundation and architecture (proposal)

**Doc:** foundation **04** · **Created:** 2026-05-20 · **Revised:** 2026-05-20  
**Status:** proposal — owner approval before broad implementation  
**Status gate:** foundation-complete when §14 checklist passes

**References:**

- P0 intent — `.work/plans/foundation/20260520-01-tools-teleprompt-initial-scope.md`
- P1 scope — `.work/plans/foundation/20260520-01-tools-teleprompt-scope.md`
- Doc 02 / 03 — skipped (no external integrations; no adjacency modules in v1)
- `.cursorrules` · `DOCS_TECH_STACK.md` (pins pending P2/P4)

**Terminology:** This document is the **architecture foundation** — **not** the master implementation plan (`*-full-plan.md`).

---

## 1. First principles (binding)

1. **Device-first storage:** User scripts live on the client after handoff; server is a short-lived relay only when QR path is not used.
2. **Evidence over memory** (`.cursorrules` §5): stack and limits pinned in ADRs and `DOCS_TECH_STACK.md`.
3. **Minimal attack surface:** No accounts, no DB, no filesystem uploads, no script content in logs.
4. **Safe rich display:** Markdown → HTML only through a **sanitized** render pipeline in `prompter-ui`.
5. **Offline-first shell:** PWA caches app shell; prompter runs offline with local script.

---

## 2. Bounded contexts (proposed)

| Context | Responsibility | Owns | Talks via |
|---------|----------------|------|-----------|
| **prompter-ui** | SPA: editor, player, settings, local persistence, PWA, QR encode/decode, markdown render | `localStorage`/IndexedDB, service worker, render pipeline | HTTPS → pairing-api (relay only); QR via client-only |
| **pairing-api** | Ephemeral session create / claim / expire | Session tokens, OTP, relay blob | Redis TTL store |
| **platform** | Health, middleware, rate limits, config | Env, structured logging | Used by pairing-api |

**Dependency direction:** `prompter-ui` → `pairing-api` → `platform`. No reverse dependency. No shared DB.

```text
                    ┌── QR fragment (≤ threshold) ──► mobile localStorage
                    │    (no server)
[Desktop prompter-ui]
                    │
                    └── POST /sessions ──► [pairing-api] ──► Redis (5m)
                              ▲
[Mobile prompter-ui] ── claim + OTP ──┘
```

---

## 3. Highest-risk paths

### 3a. Cross-device claim (relay)

Failure modes: token leak, OTP brute force, session not deleted, script logged. State machine unchanged (CREATED → CLAIMED | LOCKED | EXPIRED).

### 3b. Markdown → HTML display (XSS)

Failure modes: malicious markdown/HTML, CSP bypass, unsafe DOM injection.

| Control | Implementation |
|---------|----------------|
| Parse | CommonMark-compatible library (no raw HTML in user markdown by default) |
| Sanitize | DOMPurify (or equivalent) on HTML output before render |
| Render | React controlled render; no unsanitized `innerHTML` |
| CSP | Restrict script sources; `default-src 'self'` baseline in P4 |
| Storage | Persist **source markdown** + `format` flag; render at display time |

---

## 4. Cross-device handoff modes (v1)

| Mode | When | Server body | Auth |
|------|------|-------------|------|
| **QR / fragment** | Payload ≤ ~8 KB compressed | None | Fragment not sent to server logs |
| **Relay + OTP** | Larger scripts | Redis ≤5 min | Token + OTP |

Client UX: offer QR when under threshold; otherwise relay. Both paths land script in mobile `localStorage`.

---

## 5. PWA / offline (v1)

| Layer | Offline behavior |
|-------|------------------|
| App shell | Service worker precaches JS/CSS/icons/manifest |
| Prompter | Works offline when script already in local storage |
| Editor / new upload | Available offline (local only) |
| Pairing API | Requires network (expected) |
| QR scan | Works offline after payload in fragment consumed locally |

**Libraries (proposal):** Vite PWA plugin or Workbox; cache-first for static assets, network-first for API.

---

## 6. Recommended technology stack (proposal — ADRs in P2)

| Layer | Choice | Rationale | ADR |
|-------|--------|-----------|-----|
| Frontend | **React + Vite** SPA, TypeScript | PWA, markdown ecosystem | 001 (proposed) |
| Markdown | **markdown-it** or **marked** + **DOMPurify** | Render + sanitize | 001 (proposed) |
| QR | **qrcode** (generate) + camera API / manual paste URL | Client-only handoff | 001 (proposed) |
| Backend | **Python 3.12 + FastAPI** | Pairing API | 001 (proposed) |
| Ephemeral store | **Redis 7** | TTL relay | 002 (proposed) |
| Database | **None** | Owner requirement | n/a |
| Reverse proxy | nginx or Caddy | TLS, static + API | P5 |
| Container | **Docker Compose** | Owner requirement | P5 |

---

## 7. Repository layout (proposed)

```
tools-teleprompt/
├── frontend/                 # prompter-ui (Vite + React + PWA)
│   ├── src/
│   │   ├── prompter/
│   │   ├── pairing/          # relay client + QR handoff
│   │   ├── markdown/         # parse + sanitize
│   │   └── pwa/              # service worker registration
│   └── Dockerfile
├── api/                      # pairing-api + platform
│   ├── src/
│   │   ├── pairing/
│   │   └── platform/
│   ├── tests/
│   └── Dockerfile
├── deploy/
├── .ai/                      # Agent OS (read-only process tree)
├── .work/
├── DOCS_TECH_STACK.md
└── README.md
```

---

## 8. Security summary

| Area | Approach |
|------|----------|
| Markdown XSS | Sanitized HTML output; disallow raw HTML in markdown config |
| Relay input | UTF-8 text + format enum; max size |
| QR fragment | Compress + encode; size cap; same-origin only |
| Headers | CSP, `X-Content-Type-Options`, `Referrer-Policy` |
| Logging | No script, OTP, token, or fragment payload |

---

## 9. Observability summary

| Signal | Name (draft) |
|--------|----------------|
| Counter | `pairing.session.created` |
| Counter | `pairing.session.claimed` |
| Counter | `handoff.qr.generated` (client metric optional) |
| Counter | `handoff.qr.consumed` (client metric optional) |

---

## 10. Testing strategy

| Layer | Tooling | Gate |
|-------|---------|------|
| Markdown sanitize | vitest + XSS fixture strings | Task gate |
| API | pytest + fakeredis | Milestone |
| PWA offline | Playwright offline mode | Milestone |
| E2E | Playwright — relay + QR smoke | Milestone |

---

## 11. ADR register (§13)

| ADR | Topic | Status |
|-----|-------|--------|
| 001 | Application stack | **Decided** — `20260520-001-application-stack.md` |
| 002 | Ephemeral store (Redis) | **Decided** — `20260520-002-ephemeral-redis-store.md` |
| 003 | Hosting / deployment | **Decided** — `20260520-003-hosting-deployment.md` |
| 004 | Tenancy model | **Decided** — `20260520-004-tenancy-model.md` |
| 005 | Markdown sanitization | **Decided** — `20260520-005-markdown-sanitization.md` |

---

## 12. Cross-links (01 ↔ 04)

| Doc 01 / scope requirement | Doc 04 element |
|------------------------------|----------------|
| Plain + markdown | §3b render pipeline |
| HTML in prompter | §3b sanitized display |
| PWA offline v1 | §5 |
| QR v1 | §4 dual handoff |
| Ephemeral relay | `pairing-api` + Redis |
| No database | No persistence layer |

---

## 13. Foundation gate checklist (§14)

- [x] Docs 01 (initial + scope) consistent with this doc
- [x] Doc 02/03 explicitly skipped with rationale
- [x] Registries reviewed (owner decisions U2, U4, U7 resolved)
- [x] `DOCS_TECH_STACK.md` pins versions (P4)
- [x] Directory map updated (P3) — `.ai/standards/20260520-DIRECTORY_MAP.md`
- [x] High-risk SPECs drafted (P3: `prompter-ui`, `pairing-api`, `markdown-render`)
- [x] No application code required for **plan-master-ready**

**Foundation-complete (doc §14):** yes — pending P6 HANDOFF gate snapshot and certify.

---

## 14. Explicit deferrals

| Item | Deferred to | Owner |
|------|-------------|-------|
| CAPTCHA on session create | When abuse observed | eng |
| HA / multi-region | post-v1 | eng |
| DOCX/RTF import | post-v1 | owner |

**Removed from deferrals (now v1):** markdown rendering, PWA offline, QR handoff.

---

## 15. Plan-master handoff note

Plan-master authors `*-full-plan.md` after P6 certify. This doc does **not** contain milestone schedule or agent task lists.
