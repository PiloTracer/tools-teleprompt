# tools-teleprompt — Product scope (v1)

**Doc:** foundation **01** (P1 expanded scope) · **Created:** 2026-05-20 · **Revised:** 2026-05-20  
**Supersedes:** none · **Builds on:** `20260520-01-tools-teleprompt-initial-scope.md` (P0 intent)

## Audience and document purpose

| Layer | Audience | What they need |
|-------|----------|----------------|
| **Development** | Engineers | Testable boundaries, API contracts, acceptance themes |
| **Product** | Owner | Confirmed in/out scope and deferred lanes |

**Architecture foundation (doc 04):** `.work/plans/foundation/20260520-04-foundation-architecture.md` — bounded contexts, stack proposal, §13–§14 gates. **Not** the master implementation plan (`*-full-plan.md`).

**Integrations (doc 02):** Skipped — no external vendor APIs in v1 (`p1-integrations: none`).

**Adjacency (doc 03):** Skipped — v1 self-contained (`p1-adjacent: none`).

---

## Assumption ledger

Sync with `.work/plans/ASSUMPTIONS.md`. P0 founder intent remains canonical in `*-initial-scope.md` (verbatim).

### Confirmed (P0 + P1 + owner revision)

| ID | Statement |
|----|-----------|
| C1 | Ephemeral relay for cross-device (large scripts); no durable server script library |
| C2 | OTP + magic URL for cross-device relay path only |
| C3 | Same-device path: local persistence only, no pairing |
| C4 | **v1 supports plain text and markdown**; markdown prompter shows **HTML-formatted** text (sanitized) |
| C5 | **PWA offline in v1** — service worker, installable, offline app shell + cached assets |
| C6 | **QR handoff in v1** for small scripts (URL fragment; no server body) |

### Defaults (owner-confirmed unless overridden)

| Topic | Value | Registry |
|-------|-------|----------|
| Max script size | **256 KB** UTF-8 after normalization | U1 (open — default accepted) |
| QR size threshold | **≤ 8 KB** compressed payload in fragment (proposal) | U8 (new) |
| Markdown subset | CommonMark-compatible subset; no raw HTML in source | P3 SPEC |

---

## Architecture directions (non-prescriptive — architecture foundation in doc 04)

See doc 04 for bounded contexts (`prompter-ui`, `pairing-api`, `platform`), dual handoff paths (relay + QR), PWA/offline, and markdown render pipeline.

---

## Functional requirements (v1 themes)

| ID | Theme | Acceptance summary |
|----|-------|-------------------|
| FR-01 | Script capture | Paste, type, upload `.txt`/`.md`/plain; size validated; format detected or selected |
| FR-02 | Markdown rendering | Markdown scripts render as **HTML in teleprompter**; plain text renders as pre-wrapped text |
| FR-03 | Local persistence | Script (source + format flag) and UI settings survive reload on same device |
| FR-04 | Teleprompter playback | Speed, play/pause, fullscreen, mirror, themes, wake lock |
| FR-05 | Cross-device relay | Desktop → URL + OTP → mobile claim → delete-on-read |
| FR-06 | Cross-device QR | Desktop → QR with fragment payload (≤ threshold) → mobile scan → no server body |
| FR-07 | Same-device shortcut | Direct entry skips OTP and pairing |
| FR-08 | Limits | Max size enforced client + server (relay path) |
| FR-09 | PWA offline | App shell and static assets work offline; prompter works with locally stored script offline |
| FR-10 | Responsive shell | Phone, tablet, desktop; installable where supported |

---

## In scope (v1)

- SPA teleprompter (editor + player + settings)
- Markdown → HTML pipeline with **sanitization** before display
- Pairing API (create session, claim, expire sweep)
- QR handoff UI (generate + scan/deep-link consume)
- PWA: manifest, service worker, offline caching strategy
- Docker Compose dev/prod topology (proposal in P5)
- Security baseline (rate limit, OTP, CSP, no content logs)
- English UI first (i18n structure optional in P4)

---

## Out of scope (v1)

| Item | Notes |
|------|-------|
| User accounts / OAuth | Owner explicit |
| SQL/NoSQL database | Owner explicit |
| Cloud script library | Privacy model |
| Gov/regulatory/payment APIs | No doc 02 |
| Adjacency modules | No doc 03 |
| WebRTC P2P handoff | Complexity |
| RTF/DOCX import | Defer |
| Arbitrary HTML paste as source format | Markdown only; HTML is **output** of render pipeline |

---

## User journeys (critical paths)

### J1 — Present on same phone (offline-capable)

Open app (installed PWA) → enter script → configure → fullscreen prompt. **Works offline** after first load if script already local.

### J2 — Script on laptop, prompt on phone (relay)

Laptop: submit script → show URL + OTP + QR for URL.  
Phone: open URL → OTP → script in local storage → prompt.

### J2b — Script on laptop, prompt on phone (QR, small script)

Laptop: submit small script → show QR (fragment payload).  
Phone: scan QR → script in local storage → prompt. **No server relay.**

### J3 — Return visit same device

Open app → load from local storage → prompt (offline OK).

---

## API surface (pairing — draft)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/sessions` | Create ephemeral session (body: text + optional `format`: plain \| markdown) |
| POST | `/api/v1/sessions/{token}/claim` | Verify OTP, return body once, delete session |
| GET | `/health` | Liveness |

QR path uses **no API** for script body. Pairing API unavailable offline (expected).

---

## Non-functional requirements (themes)

| ID | Theme | Target |
|----|-------|--------|
| NFR-01 | Privacy | Prefer QR for small scripts; relay ≤5 min delete-on-read |
| NFR-02 | Performance | Smooth scroll with HTML content on mid-tier mobile |
| NFR-03 | Security | Sanitized HTML; CSP; see R6 in registry |
| NFR-04 | Offline | Core prompter + cached shell offline after install |
| NFR-05 | Simplicity | No DB |

---

## Risks (scope-linked)

See `RISK_REGISTRY.md` R4–R9.

---

## Traceability

| Artifact | Path |
|----------|------|
| P0 intent | `20260520-01-tools-teleprompt-initial-scope.md` |
| Architecture foundation | `20260520-04-foundation-architecture.md` |
| Registries | `../ASSUMPTIONS.md`, `../RISK_REGISTRY.md`, `../UNKNOWNS.md` |
| Master plan (later) | `../full/*-full-plan.md` |
