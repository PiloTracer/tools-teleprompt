# tools-teleprompt

**Version 0.5.0**

A self-hosted web teleprompter. You load a script in the browser, hand it to a phone with QR codes, and read from the phone screen. **Your script lives in the browser** (local storage) — the usual path never writes the script to the server, and there is no account database.

**Live instance:** [https://teleprompt.aiepic.app](https://teleprompt.aiepic.app)

---

## Typical use case

This is the intended day-to-day flow:

1. **Open the app** on a computer — e.g. [https://teleprompt.aiepic.app](https://teleprompt.aiepic.app) (or your own deploy).
2. **Load the script** — upload a file or paste text into the editor. The script is kept in the browser’s **local storage**, not as a permanent file on the server.
3. **Hand off to the phone** — open **Handoff**, generate QR code(s), and scan them with the mobile device. For typical script sizes this uses **single QR** or **multi-QR**: the script is encoded in the QR URL(s), so **nothing is stored on the server**.
4. **Read on the phone** — the phone opens the player; adjust speed, font, theme, and mirror as needed.
5. **Optional speech sync** — tap the language control (e.g. **ES** / **EN**) to scroll with your voice. Use **Google Chrome** (desktop or Android). Sync uses the browser’s built-in Speech Recognition only — **no cloud streaming ASR service** is required or bundled.

Notes:

- **Nothing permanent is saved on the server** in this flow. Persistence is client-side (browser local storage). Optional LAN / relay handoff modes can briefly touch the API for oversized scripts; you can disable those for a public host (see [Publishing publicly without server-side script storage](#publishing-publicly-without-server-side-script-storage)).
- Steps above omit fine-grained UI details (theme, mirror, multi-QR scan order, PWA install). See [Using the app](#using-the-app) for routes and handoff modes.

---

## What you get

| Feature | Description |
|---------|-------------|
| **Editor** | Plain text or Markdown script with live preview |
| **Player** | Fullscreen scrolling teleprompter (speed, font size, light/dark, mirror) |
| **PWA** | Installable; player works offline after first load |
| **Handoff** | Move a script to another device — usually QR / multi-QR (no server storage) |
| **Privacy** | Scripts stay in the browser; the usual QR path never uploads the script |
| **Speech sync** | Optional mic-driven scroll via Chrome’s built-in Speech Recognition (no streaming ASR vendor) |

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

> **Note on microphone access:** Chrome generally requires a secure origin (HTTPS or `localhost`) to use the microphone for speech sync. If speech sync does not activate over plain HTTP, either serve the app over HTTPS (see [`deploy/README.md`](deploy/README.md)) or, for a quick local test, run the browser on the same computer using `localhost`. Prefer **Chrome** for speech sync; other browsers may lack or limit the Web Speech API.

### Troubleshooting

- **Cannot resolve `tele.aiepic.app` on the phone:** Verify the hosts entry matches the hotspot IP shown on the computer and that no VPN or private DNS is overriding it.
- **Connection refused / timeout:** Confirm the stack is running (`./bin/start.sh dev status`) and that the phone is on the same hotspot network.
- **QR codes from handoff point to `localhost`:** Regenerate the QR codes after setting `PUBLIC_HOST` and restarting the stack.
- **502 from Caddy on startup:** The frontend container may still be starting. Wait a few seconds and refresh; see [`deploy/README.md`](deploy/README.md) for production frontend readiness notes.

---

## Using the app

| Step | URL | What to do |
|------|-----|------------|
| 1. Write | `/` | Upload a file or paste text; choose plain or Markdown |
| 2. Hand off | `/handoff/create` | On the PC: generate QR code(s) and scan with the phone |
| 3. Present | `/play` | On the phone: read the teleprompter; tune speed, font, theme |
| 4. Settings | `/settings` | Defaults for speed, font, theme |

Handoff modes (picked automatically for your script size):

| Mode | Sends script to server? | Best for |
|------|------------------------|----------|
| **Single QR** | ❌ No — encoded in the QR URL | **Usual case** — small scripts; one scan opens the player |
| **Multi-QR** | ❌ No — encoded across QR URLs | **Usual case** — larger scripts; scan each code (any order) |
| **LAN link** | ✅ Yes — API memory ~2 minutes (optional fallback) | Same Wi-Fi / hotspot when QR is impractical |
| **Relay + OTP** | ✅ Yes — Redis ~5 minutes (optional fallback) | Very large scripts — short code on phone, OTP on laptop |

For the usual PC → phone workflow, prefer QR / multi-QR so the script never leaves the client encoding path.

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

## Publishing publicly without server-side script storage

If you expose this app to the internet and want to guarantee that user scripts never touch your server, disable the server-based handoff modes. With this setting, only **Single QR** and **Multi-QR** remain available; **LAN link** and **Relay + OTP** are blocked both in the UI and at the API.

1. In `.env.dev` (or `.env.prd` for production), set:

   ```bash
   DISABLE_SERVER_HANDOFF=true
   ```

2. Restart the stack:

   ```bash
   ./bin/start.sh prd restart
   # or: ./bin/start.sh dev restart
   ```

3. Confirm the public config reports the flag:

   ```bash
   curl -sS "https://teleprompt.aiepic.app/api/v1/handoff/public-config" | grep disable_server_handoff
   # local: curl -sS "http://localhost:9080/api/v1/handoff/public-config" | grep disable_server_handoff
   ```

When `DISABLE_SERVER_HANDOFF=true`:

- The handoff page hides LAN and Relay buttons.
- `POST /api/v1/sessions` and `POST /api/v1/handoff/lan` return `403 Forbidden`.
- Scripts still live in the user’s browser local storage for normal editing/playing.
- Redis is no longer needed for script privacy, although the stack currently still starts it.

> **Note:** Even with server handoff disabled, always serve the public instance over HTTPS so Chrome allows microphone access for speech sync.

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
docker compose --project-directory deploy -f deploy/docker-compose.dev.yml exec frontend sh -c "cd /app && npm run lint && npm run typecheck && npm test"
docker compose --project-directory deploy -f deploy/docker-compose.dev.yml exec api sh -c "cd /app && ruff check . && pyright . && pytest tests/ -q"
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
├── api/               FastAPI pairing API (optional LAN/relay, public config)
├── deploy/            Docker Compose files, Caddyfile.dev, deploy runbook
├── bin/start.sh       Dev / prd stack manager
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

- **Current release:** `0.5.0` (see [`CHANGELOG.md`](CHANGELOG.md) and GitHub Releases)
- Frontend and API packages also declare `0.5.0` in their respective manifests
- Create a GitHub Release from tag `v0.5.0` when publishing

---

## License

[MIT](LICENSE) · Copyright (c) 2026 PiloTracer
