# Changelog

All notable changes to this project are documented here. Version format follows [SemVer](https://semver.org/).

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

[0.1.0]: https://github.com/PiloTracer/tools-teleprompt/releases/tag/v0.1.0
