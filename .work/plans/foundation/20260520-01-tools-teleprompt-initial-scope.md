# tools-teleprompt — Initial exploration and scope

**Doc:** foundation **01** (P0 product intent) · **Created:** 2026-05-20

## Audience and document purpose

| Layer | Audience | What they need |
|-------|----------|----------------|
| **Development** | Engineers | Boundaries, flows, security posture, storage rules, explicit unknowns |
| **Shipped product** | End users | UX/help — out of scope here; personas deferred to P4 if UI formalized |

---

## Assumption ledger

### Founder intent (verbatim — P0 capture)

> dockerized web application for a teleprompter
> simple yet awesome application to display in any device: must be fully responsive
> speed must be adjustable and add any key-features for a tele-prompter
> must be 100% web
> no user management necessary
> the documents are pasted, uploaded, everything handled in local storage with combination of 5 minute storage
> no database necessary, nothing complex
> max size of document can be set
> endpoint to create quick link at the same time a document is posted, for example:
> - on desktop computer user pastes, or upload, or drags and drop file
> - the document is temporarly saved in the server
> - a unique link is saved with a OTP
> - user switches to his tablet or mobile phone and enters the url
> - user needs to validate the otp  (again these magic urls and otp is only required for initiating from another device)
> - enters the magic url, and the file is immediately moved to the local storage while the app is setup with the text to teleprompt
> - if user just acceses the teleprompt app directly and uploads a file or provides the text directly through the mobile device, nothing else is needed, otp is not needed, no magical url is needed.
> - add minimal recommended security, what can be implemented to prevent malicious use while leaving the app available.
> - how do we reduce risks of files being saved in the server, probably saving files in the server is a bad idea, what are the alternatives?
> -fill in the gaps, provide solid foundation
> -the app should work as similarly to a mobile application as possible
> - any sensitive information from the user should remain in the user's devices only if possible
> - revise this request carefully, analyze, and provide foundational documentation.
>
> bottomline, the app must be simple, secure, convenient, cross-device if possible, and provide controls for the user to configure the teleprompter as required.

### Confirmed facts (repository evidence)

- Project name: **tools-teleprompt** (owner, P0).
- `.cursorrules` and `.work/` bootstrap exist; stack tokens not yet pinned (`DOCS_TECH_STACK.md` Draft).
- Owner requires: **100% web**, **no accounts**, **no database**, **Dockerized** deployment.
- Cross-device path is **optional**; same-device path uses **browser local storage** only.

### Inferences (plausible — validate in P1/P2)

| ID | Inference | Label |
|----|-----------|-------|
| I1 | Primary users: solo presenters, streamers, instructors using phone/tablet as prompter while script is prepared on desktop | Inference |
| I2 | “5 minute storage” applies to **cross-device handoff only**, not long-term script retention | Inference |
| I3 | Acceptable upload types for v1: plain text, markdown, `.txt`, `.md` | Confirmed | owner P1 revision | |
| I4 | PWA (install, offline app shell, fullscreen) satisfies “works like a mobile app” | Confirmed | owner P1 revision | |

### Unknowns (decide with stakeholders)

| # | Unknown | Impact |
|---|---------|--------|
| 1 | Max document size default (e.g. 64 KB vs 256 KB vs 1 MB) | Pairing payload limits, UX errors |
| 2 | Whether pairing relay may use **Redis** vs pure in-process memory (multi-instance deploy) | P5 infra |
| 3 | Rich text vs plain text only in v1 | **Resolved:** plain text + markdown; markdown renders as sanitized HTML in prompter | owner 2026-05-20 |
| 4 | Offline / installable PWA required for v1 or v1.1 | **Resolved:** offline PWA in v1 | owner 2026-05-20 |

---

## Product scope (v1)

### In scope

| Area | Requirement |
|------|-------------|
| **Teleprompter UI** | Scroll/play controls, adjustable speed, font size, mirror/flip if standard, fullscreen, keyboard shortcuts (desktop), touch-friendly controls (mobile) |
| **Script input (same device)** | Paste, type, upload/drag-drop → persist in **browser local storage**; no OTP, no magic link |
| **Cross-device handoff** | Desktop prepares script → user gets **unguessable URL** + **OTP** → mobile opens URL, enters OTP → script lands in **mobile local storage**, prompter ready; server copy **removed on successful handoff** |
| **Ephemeral server role** | Short TTL (~5 minutes), **no durable DB**, no user accounts |
| **Limits** | Configurable max document size (client + server enforced) |
| **Deployment** | Dockerized web stack (compose); documented local dev |
| **Responsive / app-like** | Mobile-first layout; **PWA v1** (manifest, service worker, offline app shell, install, fullscreen) |
| **Script formats** | **Plain text and markdown**; markdown teleprompter displays **HTML-formatted** output (sanitized) |
| **QR cross-device** | QR fragment handoff for small scripts (no server body); relay for larger |
| **Security baseline** | Rate limits, OTP hardening, size/type limits, no content logging, delete-on-read for relay |

### Out of scope (v1)

| Area | Reason |
|------|--------|
| User accounts, auth providers, RBAC | Owner: not necessary |
| SQL/NoSQL database | Owner: not necessary |
| Long-term server-side script library | Conflicts with privacy goal |
| Collaborative editing, cloud sync | Complexity |
| Native iOS/Android apps | 100% web constraint |
| DRM, rights management for scripts | N/A |

---

## Revised product flows (gap-fill)

### Flow A — Same device (default, simplest)

```text
User opens app → paste / upload / type script
    → validate size → save to localStorage (and/or IndexedDB for larger blobs)
    → teleprompter view with user settings (speed, font, theme)
```

No server involvement for script body. Server may still serve static assets and health check.

### Flow B — Cross-device handoff (optional path)

```text
[Desktop] User submits script (paste/upload/drop)
    → Client validates size
    → POST /api/v1/sessions (or similar) → server creates pairing session
    → Response: magic_url (token in path), otp_display (6 digits), expires_at
    → Desktop shows URL + OTP (QR optional)

[Mobile] User opens magic_url (token only in URL; no script in query string)
    → Enters OTP
    → POST /api/v1/sessions/{token}/claim { otp }
    → Server verifies, returns script **once**, deletes session payload
    → Mobile writes to localStorage, navigates to prompter
```

**OTP + magic URL only when** the user started on another device. Direct mobile access skips Flow B entirely.

### Flow C — QR handoff (v1, small scripts)

For scripts under a size threshold (e.g. ≤ 8 KB compressed), desktop offers **QR encoding a same-origin deep link** with payload in URL **fragment** (`#` — not sent to server logs). Mobile scans → **no server storage**. User chooses relay (Flow B) or QR (Flow C) when both apply; QR preferred when under threshold.

**Foundation recommendation (revised):** Implement **A** (relay) and **B** (QR) in v1; user or client auto-selects by size.

---

## Storage and privacy architecture (analysis)

### Owner concern: “Saving files on the server is probably a bad idea”

**Assessment: Correct for this product.** Durable or filesystem-backed upload storage introduces:

- Malware/abuse (polyglot files, zip bombs)
- Retention/compliance (user scripts may be sensitive)
- Disk exhaustion and backup scope
- Operational burden (scanning, secure deletion proofs)

### Recommended v1 pattern: **ephemeral relay, not file hosting**

| Principle | Implementation |
|-----------|----------------|
| **Data minimization** | Server holds script **only** during cross-device pairing, max ~5 minutes |
| **Delete on read** | Successful OTP claim **must** delete session payload immediately |
| **No filesystem uploads** | Store **normalized UTF-8 text** in memory/Redis, not original files |
| **Encryption at rest (relay)** | Optional: encrypt blob with random key; deliver key to desktop UI separately (fragment or second channel) so Redis leak does not expose plaintext |
| **Canonical store** | After handoff, **only** device `localStorage` / IndexedDB |
| **Logging** | Never log script body, OTP, or tokens; log session id + outcome codes only |

### Alternatives (decision matrix)

| Option | Server retains body? | Cross-device | Complexity | Notes |
|--------|---------------------|--------------|------------|-------|
| **A. Ephemeral memory/Redis relay** (recommended v1) | Yes, ≤5 min, delete-on-read | OTP + URL | Low | Matches owner story; hardened TTL + rate limits |
| **B. URL fragment / QR payload** | No | QR scan | Low–med | Best privacy; size-capped |
| **C. WebRTC data channel** | No (P2P) | Signaling only | High | Overkill for v1 |
| **D. Filesystem upload dir** | Yes, durable risk | Any | Med | **Not recommended** |

**Foundation recommendation (revised):** Implement **A** and **B** in v1; **C** and **D** not used.

---

## Teleprompter feature baseline (v1)

| Feature | Notes |
|---------|-------|
| Scroll speed | Slider + presets; keyboard +/- on desktop |
| Play / pause | Auto-scroll with manual override |
| Font size / line height | User preference, persisted locally |
| Mirror text | Optional (camera/mirror setups) |
| Fullscreen | Full viewport; hide chrome |
| Theme | Light/dark/high-contrast minimum |
| Progress | Optional line indicator or % |
| Orientation | Portrait/landscape friendly |
| Wake lock | Screen stays on during prompt (Screen Wake Lock API where supported) |

Deferred unless owner prioritizes: voice scroll, remote control WebSocket, multi-script library UI, RTF import.

---

## Non-functional expectations

| Area | Requirement |
|------|-------------|
| **Availability** | Single-region; no HA mandate for v1 personal tool |
| **Privacy** | User script on server only during optional pairing window; prefer device-only |
| **Performance** | Smooth scroll 60fps target on mid-tier phones |
| **Security** | See § Minimal security baseline |
| **Compliance** | No PII collection; no accounts → minimal GDPR surface; still avoid logging content |

---

## Minimal security baseline (v1)

| Control | Purpose |
|---------|---------|
| Unguessable session token | ≥128-bit random; path token, not sequential id |
| OTP | 6 digits, single-use, ≤5 min TTL, max attempts (e.g. 5) then lockout |
| Rate limiting | Per-IP on session create and claim |
| Max body size | Enforced client + server (configurable) |
| Content type | Plain text and markdown sources; UTF-8 normalization; reject binaries at API |
| CORS / CSRF | Same-site API; CSRF token on POST if cookies used (prefer stateless JSON API) |
| Security headers | CSP, `X-Content-Type-Options`, `Referrer-Policy` |
| Abuse | Optional Turnstile/hCaptcha on **session create** only if abuse observed |
| Auto-expiry | Background sweep deletes expired sessions |
| No content in logs | Structured logs: `session.created`, `session.claimed`, `session.expired` |

---

## Risks (initial)

| ID | Risk | Mitigation direction |
|----|------|-------------------|
| R4 | Script exfiltration via leaked magic URL | Short TTL, OTP, single claim, high entropy token |
| R5 | Abuse of session-create endpoint (spam, storage fill) | Rate limit, max size, cap concurrent sessions per IP |
| R6 | XSS via markdown/HTML in prompter | Sanitize pipeline (markdown → HTML → DOMPurify); strict CSP; no raw `dangerouslySetInnerHTML` without sanitize |
| R7 | localStorage quota exceeded on mobile | Size cap + IndexedDB fallback + clear error |
| R8 | Multi-instance deploy without shared Redis | Sticky sessions or Redis for relay only |

---

## Architecture directions (non-prescriptive — architecture foundation in doc 04)

Proposed bounded contexts for P1 doc 04 (not decided here):

| Context | Responsibility |
|---------|----------------|
| **prompter-ui** | SPA: editor, player, settings, local persistence |
| **pairing-api** | Ephemeral session create/claim/expire (only cross-device) |
| **platform** | Health, config, rate limits, Docker wiring |

**Stack direction (for ADRs in P2):** static/SSR-light frontend (React + Vite or Next.js static export) + small Python FastAPI or Node API for pairing; **Redis optional** for ephemeral store; **no database**.

**Architecture foundation (doc 04):** `.work/plans/foundation/YYYYMMDD-04-foundation-architecture.md` — **Not** the master implementation plan (`*-full-plan.md`).

---

## How `.cursorrules` applies

- Core Principles 1–7 bind all implementation.
- No PII in logs; no logging script content.
- Docker/dev commands pinned when `REPLACE:` tokens filled in P2–P5.
- Protected files (`docker-compose.yml`, etc.) need explicit owner approval before commit (P5).

---

## Traceability

| Artifact | Path |
|----------|------|
| This doc | `.work/plans/foundation/20260520-01-tools-teleprompt-initial-scope.md` |
| Registries | `.work/plans/ASSUMPTIONS.md`, `RISK_REGISTRY.md`, `UNKNOWNS.md` |
| P1 scope | `20260520-01-tools-teleprompt-scope.md` |
| Architecture foundation (doc 04) | `20260520-04-foundation-architecture.md` |
| Master plan | `.work/plans/full/*-full-plan.md` (plan-master, after certify) |
