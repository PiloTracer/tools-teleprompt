# tools-teleprompt

**Version 0.2.5**

A self-hosted web teleprompter: paste or upload a script, tune scroll speed and display, present fullscreen on any device. Send the script to a phone or tablet via QR or a short-lived link — no accounts, no database.

---

## What you get

| Feature | Description |
|---------|-------------|
| **Editor** | Plain text or Markdown script with live preview |
| **Player** | Fullscreen scrolling teleprompter (speed, font size, light/dark, mirror) |
| **PWA** | Installable; player works offline after first load |
| **Handoff** | Move a script to another device: QR, multi-QR, LAN link, or relay + OTP |
| **Privacy** | Scripts stay in the browser after handoff; relay uses Redis with a 5-minute TTL |

---

## Quick start

**Requirements:** Docker Engine 24+ with Compose v2. Do not run `npm` or `pip` on the host — everything runs in containers.

```bash
git clone https://github.com/PiloTracer/tools-teleprompt.git
cd tools-teleprompt
cp .env.example .env.dev
./bin/start.sh dev start
```

Open **http://localhost:9080** (Caddy — the main app URL).

Interactive menu (start/stop/logs/restart):

```bash
./bin/start.sh dev
```

The menu shows which env file is loaded (`Env file: .env.dev`). Use option **4** to restart after changing `.env.dev`.

---

## Local installation with a hotspot and custom domain

Use this setup when you want to present from a phone or tablet connected to your computer's hotspot, and access the app through a friendly local domain such as `tele.aiepic.app`.

### 1. Prepare the computer

Use a laptop or desktop that can share its network as a Wi-Fi hotspot. Note the hotspot IP address your computer assigns itself — for example `10.42.0.1`. This IP is used in the steps below; replace it with the actual IP on your machine.

### 2. Configure the environment

Edit `.env.dev` so the app advertises the hotspot domain instead of `localhost`:

```bash
PUBLIC_HOST=tele.aiepic.app
PUBLIC_ORIGIN=http://tele.aiepic.app:9080
API_PUBLIC_BASE_URL=http://tele.aiepic.app:9080
```

If you changed `CADDY_HOST_PORT` from the default `9080`, use that port in the URLs above.

Start the stack:

```bash
./bin/start.sh dev start
```

Wait until the health check reports the stack as ready. The app is now reachable on the computer at **http://tele.aiepic.app:9080** once the phone is configured.

### 3. Configure the phone

On the mobile device that will act as the prompter screen, add the following entry to its hosts file:

```
10.42.0.1    tele.aiepic.app
```

Use the actual hotspot IP from step 1. If editing the system hosts file requires root on your device, use any trusted local DNS/hosts editor app that does not route traffic through a third-party server.

### 4. Connect the phone to the hotspot

Join the phone to the computer's Wi-Fi hotspot. The phone must be able to reach `10.42.0.1` on port `9080`.

### 5. Open the app on the phone

Open **Google Chrome** on the phone and navigate to:

```
http://tele.aiepic.app:9080
```

### 6. Create and play a script

1. Tap **Editor**, paste or type your script, and choose plain text or Markdown.
2. Tap **Player** (or open `/play`) to start the teleprompter.
3. Adjust speed, font size, theme, and mirror to your preference.
4. Tap the language button (for example **ES** or **EN**) to enable speech-sync scrolling when you are ready to speak.

> **Note on microphone access:** Chrome generally requires a secure origin (HTTPS or `localhost`) to use the microphone for speech sync. If speech sync does not activate over plain HTTP, either serve the app over HTTPS (see [`deploy/README.md`](deploy/README.md)) or, for a quick local test, run the browser on the same computer using `localhost`.

### Troubleshooting

- **Cannot resolve `tele.aiepic.app` on the phone:** Verify the hosts entry matches the hotspot IP shown on the computer and that no VPN or private DNS is overriding it.
- **Connection refused / timeout:** Confirm the stack is running (`./bin/start.sh dev status`) and that the phone is on the same hotspot network.
- **QR codes from handoff point to `localhost`:** Regenerate the QR codes after setting `PUBLIC_HOST` and restarting the stack.
- **502 from Caddy on startup:** The frontend container may still be starting. Wait a few seconds and refresh; see [`deploy/README.md`](deploy/README.md) for production frontend readiness notes.

---

## Using the app

| Step | URL | What to do |
|------|-----|------------|
| 1. Write | `/` | Paste or type your script; choose plain or Markdown |
| 2. Present | `/play` | Open the player; use controls for speed, font, theme |
| 3. Hand off | `/handoff/create` | Send the script to another device (see below) |
| 4. Settings | `/settings` | Defaults for speed, font, theme |

Handoff modes (picked automatically for your script size):

| Mode | Best for |
|------|----------|
| **Single QR** | Small scripts — one scan opens the player |
| **Multi-QR** | Larger scripts — scan each code (any order); progress shows on the phone |
| **LAN link** | Same Wi-Fi or hotspot — open a one-time link on the phone |
| **Relay + OTP** | Very large scripts — short code on phone, OTP on laptop |

---

## Phone / hotspot handoff

If QR codes point at `localhost`, your phone cannot reach them. Use your laptop's LAN IP instead.

1. In `.env.dev`, set your hotspot/LAN IP:

   ```bash
   PUBLIC_HOST=10.42.0.1
   PUBLIC_ORIGIN=http://10.42.0.1:9173
   API_PUBLIC_BASE_URL=http://10.42.0.1:9080
   ```

2. Restart: `./bin/start.sh dev restart`

3. On the **laptop**, open **http://10.42.0.1:9080/handoff/create** (not `localhost`)

4. Confirm **Handoff link host** shows your LAN IP, then generate/regenerate the QR

5. Scan with the phone; for multi-QR, scan all codes (each scan may open a new tab — that is expected)

More detail: [`deploy/README.md`](deploy/README.md) (environment variables, production checklist, security headers).

---

## Stack manager

`./bin/start.sh` accepts a context (`dev` or `prd`) and loads `.env.{context}` → `.env` → `.env.example`.

| Command | Action |
|---------|--------|
| `./bin/start.sh dev` | Interactive menu |
| `./bin/start.sh dev start` | Build and start in background |
| `./bin/start.sh dev stop` | Stop containers |
| `./bin/start.sh dev restart` | Restart stack |
| `./bin/start.sh dev logs:api` | Tail API logs |
| `./bin/start.sh dev status` | Container status |

Default ports (override in `.env.dev`):

| Port | Service |
|------|---------|
| **9080** | Caddy — use this URL day to day |
| **9173** | Vite dev + hot reload (optional direct access) |

Health check:

```bash
curl -sS "http://localhost:9080/health"
```

---

## Development

Run quality gates inside containers (stack must be up):

```bash
docker compose -f deploy/docker-compose.yml exec frontend sh -c "cd /app && npm run lint && npm run typecheck && npm test"
docker compose -f deploy/docker-compose.yml exec api sh -c "cd /app && ruff check . && pyright . && pytest tests/ -q"
```

End-to-end handoff tests:

```bash
./bin/e2e-handoff.sh
```

Stack and library pins: [`DOCS_TECH_STACK.md`](DOCS_TECH_STACK.md).

---

## Repository layout

```
tools-teleprompt/
├── frontend/          React + Vite SPA (editor, player, handoff UI)
├── api/               FastAPI pairing API (relay, LAN, public config)
├── deploy/            Docker Compose, Caddyfile, deploy runbook
├── bin/start.sh       Dev stack manager
├── VERSION            Release version (0.2.5)
└── CHANGELOG.md       Release notes
```

---

## For contributors and agents

Internal planning, ADRs, and session handoff live under `.work/` and `.ai/`. You do not need those to run or use the teleprompter.

| If you need… | Path |
|--------------|------|
| Deploy / production | `deploy/README.md` |
| Product scope | `.work/plans/foundation/20260520-01-tools-teleprompt-scope.md` |
| Architecture | `.work/plans/foundation/20260520-04-foundation-architecture.md` |
| Current iteration | `.work/plans/NEXT.md` |
| Agent rules | `.cursorrules` |

---

## Versioning

- **Current release:** `0.2.5` (see [`VERSION`](VERSION) and [`CHANGELOG.md`](CHANGELOG.md))
- Frontend and API packages also declare `0.2.5` in their respective manifests
- Create a GitHub Release from tag `v0.2.5` when publishing

---

## License

[MIT](LICENSE) · Copyright (c) 2026 PiloTracer
