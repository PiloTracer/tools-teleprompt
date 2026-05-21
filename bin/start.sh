#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE=".env"
if [[ ! -f "$ENV_FILE" ]]; then
  ENV_FILE=".env.example"
fi

docker compose -f deploy/docker-compose.yml --env-file "$ENV_FILE" up -d --build
PORT="$(grep -E '^CADDY_HOST_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo 8080)"
echo "Stack up. Open http://localhost:${PORT:-8080}"
