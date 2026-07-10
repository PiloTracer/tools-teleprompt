# Changelog

All notable changes to this project are documented here. Version format follows [SemVer](https://semver.org/).

## [0.2.6] - 2026-07-10

### Added

- `DISABLE_SERVER_HANDOFF` config: disable LAN/Relay handoff to keep scripts client-side only when publishing publicly
- Production deployment stack: `deploy/docker-compose.prd.yml`, `api/Dockerfile.prd`, `frontend/Dockerfile.prd`, `frontend/nginx.prd.conf` (prd relies on host nginx, no Caddy container)

### Changed

- Renamed `deploy/docker-compose.yml` → `deploy/docker-compose.dev.yml`, `deploy/Caddyfile` → `deploy/Caddyfile.dev`, `api/Dockerfile` → `api/Dockerfile.dev`, `frontend/Dockerfile` → `frontend/Dockerfile.dev`
- `bin/start.sh` now selects `docker-compose.{dev|prd}.yml` based on the active context
- API and frontend package manifests now report version `0.2.6`

## [0.2.5] - 2026-07-10

### Added

- Speech sync auto-standby: continuous `SpeechRecognition` with exponential restart backoff and explicit `onSyncEnded` cleanup
- Compound-word splitting in `annotateScriptWords` for more accurate script-to-speech matching
- Adaptive speech utilities: `speechResultUtils.ts`, `useVisibleWordRange.ts`, and `restartBackoff.ts`
- `bin/start.sh cleanup` and `bin/start.sh rebuild` commands for safe dangling-resource cleanup and forced container rebuilds
- README.md local installation guide: hotspot + custom domain access from a phone or tablet

### Changed

- Hardened Docker Compose deployment: `restart: unless-stopped` on the frontend service and Caddy frontend port configurable via environment variable

### Notes

- When preparing production, ensure the frontend container is healthy before Caddy proxies to it to avoid 502 errors on startup

## [0.1.0] - 2026-05-21

First public release.

### Added

- Web teleprompter: script editor (plain text and Markdown), live preview, fullscreen player with speed, font, theme, and mirror controls
- Progressive Web App (PWA) with offline support for the player
- Cross-device handoff without accounts: single QR, multi-QR (large scripts), LAN one-shot link, and relay + OTP
- Docker Compose stack: Caddy reverse proxy, Vite frontend, FastAPI pairing API, Redis (relay only)
- Interactive dev stack manager (`bin/start.sh`) with `.env.dev` / `.env.prd` context files
- CI: lint, typecheck, and unit tests for API and frontend

### Notes

- Scripts are stored locally in the browser after handoff; relay data in Redis expires in minutes
- For phone QR handoff on a hotspot, open the app via your laptop's LAN IP (not `localhost`) — see README

[0.2.6]: https://github.com/PiloTracer/tools-teleprompt/releases/tag/v0.2.6
[0.2.5]: https://github.com/PiloTracer/tools-teleprompt/releases/tag/v0.2.5
[0.1.0]: https://github.com/PiloTracer/tools-teleprompt/releases/tag/v0.1.0
