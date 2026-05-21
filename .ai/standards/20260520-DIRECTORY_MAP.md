# Directory Map — tools-teleprompt

**Status:** Binding before application code  
**Aligns with:** foundation doc 04 §7, ADR 001, 003

---

## Repository roots

| Path | Purpose |
|------|---------|
| `.ai/` | Agent OS (skills, standards templates — **read-only process tree**) |
| `.ai/standards/20260520-*.md` | **Project-bound** conventions, directory map, feature standard |
| `.work/` | Plans, SPECs, ADRs, HANDOFF, NEXT |
| `.work/plans/foundation/` | Foundation docs 01, 04 |
| `.work/features/<slug>/` | Feature SPECs |
| `.work/decisions/` | ADRs 001–005 |
| `frontend/` | prompter-ui SPA (React + Vite + PWA) |
| `api/` | pairing-api + platform (FastAPI) |
| `deploy/` | Compose, reverse proxy config (P5) |
| `DOCS_TECH_STACK.md` | Version pins (P4) |
| `.cursorrules` | Agent + engineering rules |

**No** `migrations/` in v1.

---

## Application layout

```
tools-teleprompt/
├── frontend/
│   ├── src/
│   │   ├── prompter/       # player, editor, settings
│   │   ├── pairing/        # relay client, QR encode/decode
│   │   ├── markdown/       # render pipeline (implements markdown-render SPEC)
│   │   ├── pwa/            # service worker registration
│   │   ├── lib/            # shared utils
│   │   └── App.tsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── Dockerfile
│   └── tests/
├── api/
│   ├── src/
│   │   ├── pairing/
│   │   │   ├── routes.py
│   │   │   ├── service.py
│   │   │   └── models.py
│   │   └── platform/
│   │       ├── config.py
│   │       ├── logging.py
│   │       ├── rate_limit.py
│   │       └── redis.py
│   ├── tests/
│   ├── pyproject.toml
│   └── Dockerfile
├── deploy/
│   ├── docker-compose.yml          # after P5 owner approval
│   └── Caddyfile | nginx.conf
├── .ai/
├── .work/
└── README.md
```

---

## Dependency rules

- `frontend/` → calls `pairing-api` over HTTP only.
- `api/src/pairing/` → `api/src/platform/` only.
- Markdown pipeline lives in `frontend/src/markdown/` (SPEC: `markdown-render`).

---

## Documentation read order

| Task | Read first |
|------|------------|
| Layout | This file |
| Coding style | `.ai/standards/20260520-CONVENTIONS.md` |
| Feature work | `.work/features/<slug>/*-SPEC.md` |
| Architecture | `.work/plans/foundation/20260520-04-foundation-architecture.md` |
| Stack pins | `DOCS_TECH_STACK.md` |
| Security (P4) | `.ai/standards/*-threat-model.md` (customized) |

---

## Gate

New top-level directory requires ADR + update this map.
