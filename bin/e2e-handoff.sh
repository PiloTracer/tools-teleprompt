#!/usr/bin/env sh
# Run Playwright handoff e2e (relay + QR) against a production preview build.
# Alpine frontend dev containers cannot launch Chromium; use the Playwright image.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.51.0-noble}"

docker run --rm \
  -v "$ROOT/frontend:/app" \
  -w /app \
  -e CI=true \
  "$IMAGE" \
  sh -c 'rm -rf node_modules && npm install @rollup/rollup-linux-x64-gnu && npm install && npx playwright test handoff'
