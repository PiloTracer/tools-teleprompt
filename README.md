# tools-teleprompt

Dockerized web teleprompter: paste or upload a script, configure scroll speed and display, present fullscreen on any device. Optional cross-device handoff (QR or short-lived relay + OTP). No accounts, no database — scripts stay on your devices after handoff.

**Status:** Foundation planning complete · application code not started

---

## Start here

| If you need… | Read / run |
|--------------|------------|
| What to do right now | `.work/plans/NEXT.md` |
| Session context | `.work/context/HANDOFF.md` |
| Product scope | `.work/plans/foundation/20260520-01-tools-teleprompt-scope.md` |
| Architecture foundation | `.work/plans/foundation/20260520-04-foundation-architecture.md` |
| ADRs | `.work/decisions/README.md` |
| Feature SPECs | `.work/features/*/20260520-SPEC.md` |
| Stack pins | `DOCS_TECH_STACK.md` |
| Agent rules | `.cursorrules` |
| Agent OS entry | `.ai/START_HERE.md` |

---

## Planning workflow (next steps)

```text
@plan-foundation certify plan-master-ready   ← you are here after P6
@plan-master greenfield                        ← master implementation plan
@plan-master status                            ← implementation-ready check
```

Compose files (`deploy/docker-compose.yml`, Dockerfiles) are **proposed** but not committed until owner runs **`approve compose`**. See `.work/plans/operations/20260520-docker-compose-proposal.md`.

---

## Repository layout (planned)

| Path | Purpose |
|------|---------|
| `frontend/` | React + Vite PWA (prompter UI) — *not yet created* |
| `api/` | FastAPI pairing API — *not yet created* |
| `deploy/` | Docker Compose + Caddy — *proposal only* |
| `.work/` | Plans, SPECs, ADRs |
| `.ai/` | Agent OS (skills, standards) |

See `.ai/standards/20260520-DIRECTORY_MAP.md`.

---

## Local development (after compose approval)

```bash
cp .env.example .env
bin/start.sh
# Open http://localhost:8080
```

Until compose exists, see `DOCS_TECH_STACK.md` §4 for host-based test commands.

---

## License

See repository license file if present.
