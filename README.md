# tools-teleprompt

Dockerized web teleprompter: paste or upload a script, configure scroll speed and display, present fullscreen on any device. Optional cross-device handoff (QR or short-lived relay + OTP). No accounts, no database — scripts stay on your devices after handoff.

**Status:** M1 platform scaffold in progress · master plan Approved

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

## Local development (Docker only)

**Do not run `npm install` or `pip install` on the host.** Dependencies install inside compose services via bind mounts.

```bash
cp .env.example .env   # optional; bin/start.sh falls back to .env.example
./bin/start.sh dev     # interactive menu
# or: ./bin/start.sh dev start
# Open http://localhost:9080  (or CADDY_HOST_PORT from .env)
# Direct Vite/HMR: http://localhost:9173  (FRONTEND_HOST_PORT)
```

Run tests/lint inside containers:

```bash
docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npm run lint && npm run typecheck && npm test"
docker compose -f deploy/docker-compose.yml exec api sh -c "cd /app && ruff check . && pyright . && pytest tests/ -q"
```

See `DOCS_TECH_STACK.md` §4 and `deploy/docker-compose.yml`.

---

## License

See repository license file if present.
