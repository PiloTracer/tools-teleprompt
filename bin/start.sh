#!/usr/bin/env bash
# tools-teleprompt — isolated Docker Compose dev stack manager
#
# Contexts:
#   dev   — local development stack (default)
#
# Usage:
#   ./bin/start.sh              interactive menu (dev)
#   ./bin/start.sh dev          interactive menu (dev)
#   ./bin/start.sh dev start    headless: build + up detached
#   ./bin/start.sh start        same as dev start
#   ./bin/start.sh --help
#
# Env files (first found wins): .env then .env.example (never sourced — parsed safely)
# Keys read: STACK_NAME, STACK_ENV, COMPOSE_PROJECT_NAME, PUBLIC_HOST,
#           CADDY_HOST_PORT, FRONTEND_HOST_PORT, FRONTEND_DEV_PORT
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_DIR="$REPO_ROOT/deploy"
COMPOSE_REL="docker-compose.yml"
COMPOSE_ABS="$COMPOSE_DIR/$COMPOSE_REL"

STACK_CONTEXT="dev"
ENV_FILE=""
STACK_NAME="tools-teleprompt"
STACK_ENV="dev"
COMPOSE_PROJECT_NAME=""
CADDY_HOST_PORT="9080"
FRONTEND_HOST_PORT="9173"
FRONTEND_DEV_PORT="5173"
PUBLIC_HOST="localhost"

# ── Colors (empty when not a TTY) ───────────────────────────────────────────
if [[ -t 2 ]] && command -v tput >/dev/null 2>&1; then
  C_RESET="$(tput sgr0 2>/dev/null || true)"
  C_BOLD="$(tput bold 2>/dev/null || true)"
  C_DIM="$(tput dim 2>/dev/null || true)"
  C_GREEN="$(tput setaf 2 2>/dev/null || true)"
  C_YELLOW="$(tput setaf 3 2>/dev/null || true)"
  C_RED="$(tput setaf 1 2>/dev/null || true)"
  C_CYAN="$(tput setaf 6 2>/dev/null || true)"
else
  C_RESET="" C_BOLD="" C_DIM="" C_GREEN="" C_YELLOW="" C_RED="" C_CYAN=""
fi

SERVICES=(redis api frontend caddy)

# ── Safe .env parsing (never source .env) ─────────────────────────────────────
read_dotenv_value() {
  local key="$1" file="$2" line k v
  [[ -f "$file" ]] || return 1
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%$'\r'}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    k="${line%%=*}"
    v="${line#*=}"
    k="${k%"${k##*[![:space:]]}"}"
    k="${k#"${k%%[![:space:]]*}"}"
    v="${v#"${v%%[![:space:]]*}"}"
    v="${v%"${v##*[![:space:]]}"}"
    if [[ "$k" == "$key" ]]; then
      if [[ "$v" == \"*\" && "$v" == *\" ]]; then v="${v:1:${#v}-2}"; fi
      if [[ "$v" == \'*\' && "$v" == *\' ]]; then v="${v:1:${#v}-2}"; fi
      printf '%s' "$v"
      return 0
    fi
  done <"$file"
  return 1
}

resolve_env_file() {
  if [[ -f "$REPO_ROOT/.env" ]]; then
    ENV_FILE="$REPO_ROOT/.env"
  elif [[ -f "$REPO_ROOT/.env.example" ]]; then
    ENV_FILE="$REPO_ROOT/.env.example"
  else
    ENV_FILE=""
  fi
}

load_env() {
  resolve_env_file
  local v
  if [[ -n "$ENV_FILE" ]]; then
    v="$(read_dotenv_value STACK_NAME "$ENV_FILE" 2>/dev/null || true)"
    [[ -n "$v" ]] && STACK_NAME="$v"
    v="$(read_dotenv_value STACK_ENV "$ENV_FILE" 2>/dev/null || true)"
    [[ -n "$v" ]] && STACK_ENV="$v"
    v="$(read_dotenv_value COMPOSE_PROJECT_NAME "$ENV_FILE" 2>/dev/null || true)"
    [[ -n "$v" ]] && COMPOSE_PROJECT_NAME="$v"
    v="$(read_dotenv_value CADDY_HOST_PORT "$ENV_FILE" 2>/dev/null || true)"
    [[ -n "$v" ]] && CADDY_HOST_PORT="$v"
    v="$(read_dotenv_value FRONTEND_HOST_PORT "$ENV_FILE" 2>/dev/null || true)"
    [[ -n "$v" ]] && FRONTEND_HOST_PORT="$v"
    v="$(read_dotenv_value FRONTEND_DEV_PORT "$ENV_FILE" 2>/dev/null || true)"
    [[ -n "$v" ]] && FRONTEND_DEV_PORT="$v"
    v="$(read_dotenv_value PUBLIC_HOST "$ENV_FILE" 2>/dev/null || true)"
    [[ -n "$v" ]] && PUBLIC_HOST="$v"
  fi
  [[ -n "$COMPOSE_PROJECT_NAME" ]] || COMPOSE_PROJECT_NAME="${STACK_NAME}-${STACK_ENV}"
}

require_compose_file() {
  if [[ ! -f "$COMPOSE_ABS" ]]; then
    printf '%sERROR: Compose file not found: %s%s\n' "$C_RED" "$COMPOSE_ABS" "$C_RESET" >&2
    exit 1
  fi
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    printf '%sERROR: docker not found in PATH.%s\n' "$C_RED" "$C_RESET" >&2
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    printf '%sERROR: docker compose plugin not available.%s\n' "$C_RED" "$C_RESET" >&2
    exit 1
  fi
}

init_menu_tty() {
  if [[ -z "${MENU_TTY:-}" ]] && [[ -r /dev/tty ]]; then
    MENU_TTY=/dev/tty
  fi
}

valid_service() {
  local want="$1" s
  for s in "${SERVICES[@]}"; do
    [[ "$s" == "$want" ]] && return 0
  done
  return 1
}

service_is_running() {
  local svc="$1"
  dc ps --status running --services 2>/dev/null | grep -qx "$svc"
}

running_count() {
  dc ps --status running -q 2>/dev/null | wc -l | tr -d ' '
}

require_stack_running() {
  if [[ "$(running_count)" -eq 0 ]]; then
    printf '%sERROR: Stack is not running. Start it first (menu 1 or: %s dev start).%s\n' \
      "$C_RED" "$0" "$C_RESET" >&2
    return 1
  fi
}

require_service_running() {
  local svc="$1"
  if ! valid_service "$svc"; then
    printf '%sERROR: Unknown service %q. Valid: %s%s\n' \
      "$C_RED" "$svc" "${SERVICES[*]}" "$C_RESET" >&2
    return 1
  fi
  if ! service_is_running "$svc"; then
    printf '%sERROR: Service %q is not running.%s\n' "$C_RED" "$svc" "$C_RESET" >&2
    return 1
  fi
}

wait_for_stack_ready() {
  local i max="${START_WAIT_SECONDS:-120}"
  for ((i = 1; i <= max; i += 2)); do
    if curl -sf --max-time 2 "http://${PUBLIC_HOST}:${CADDY_HOST_PORT}/health" >/dev/null 2>&1 \
      && service_is_running redis \
      && curl -sf --max-time 2 "http://${PUBLIC_HOST}:${CADDY_HOST_PORT}/" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  printf '%sWARN: Health checks not ready after %ss — stack may still be starting.%s\n' \
    "$C_YELLOW" "$max" "$C_RESET" >&2
  return 1
}

# Compose file uses paths like ../api relative to deploy/ — project-directory MUST be deploy/.
_compose_invoke() {
  local env_args=()
  [[ -n "$ENV_FILE" ]] && env_args=(--env-file "$ENV_FILE")
  docker compose \
    --project-directory "$COMPOSE_DIR" \
    -f "$COMPOSE_ABS" \
    -p "$COMPOSE_PROJECT_NAME" \
    "${env_args[@]}" \
    "$@"
}

dc() {
  _compose_invoke "$@"
}

quiet_dc() {
  local tmp log_ok=0
  tmp="$(mktemp "${TMPDIR:-/tmp}/startsh.XXXXXX")"
  if _compose_invoke "$@" >"$tmp" 2>&1; then
    log_ok=1
  fi
  if [[ "$log_ok" -eq 1 ]]; then
    rm -f "$tmp"
    return 0
  fi
  cat "$tmp" >&2
  rm -f "$tmp"
  return 1
}

# ── UI helpers ────────────────────────────────────────────────────────────────
pause_menu() {
  [[ "${MENU_QUIET:-0}" == "1" ]] && return 0
  [[ -t 0 ]] || return 0
  printf '\n%sPress Enter to return to menu…%s ' "$C_DIM" "$C_RESET" >&2
  read -r _ <"${MENU_TTY:-/dev/tty}" 2>/dev/null || true
}

print_banner() {
  local title="$1"
  printf '\n%s╔══════════════════════════════════════════════════════════════╗%s\n' "$C_YELLOW" "$C_RESET"
  printf '%s║  %-58s  ║%s\n' "$C_YELLOW" "$title" "$C_RESET"
  printf '%s║  Project: %-50s  ║%s\n' "$C_YELLOW" "$COMPOSE_PROJECT_NAME" "$C_RESET"
  printf '%s║  Root:    %-50s  ║%s\n' "$C_YELLOW" "$REPO_ROOT" "$C_RESET"
  printf '%s╚══════════════════════════════════════════════════════════════╝%s\n\n' "$C_YELLOW" "$C_RESET"
}

urls_hint() {
  local base="http://${PUBLIC_HOST}:${CADDY_HOST_PORT}"
  printf '%sURLs (%s / %s context):%s\n' "$C_BOLD" "$STACK_ENV" "$STACK_CONTEXT" "$C_RESET"
  printf '  App:      %s/\n' "$base"
  printf '  Player:   %s/play\n' "$base"
  printf '  Handoff:  %s/handoff/create\n' "$base"
  printf '  Health:   %s/health\n' "$base"
  printf '  API:      %s/api/v1/sessions\n' "$base"
  printf '  Vite dev: http://%s:%s/ (HMR WebSocket on same port)\n' "$PUBLIC_HOST" "$FRONTEND_HOST_PORT"
}

health_summary_line() {
  local api_ok="down" redis_ok="down" fe_ok="down"
  if [[ "$(running_count)" -eq 0 ]]; then
    printf 'Health: stack stopped'
    return 0
  fi
  if curl -sf --max-time 2 "http://${PUBLIC_HOST}:${CADDY_HOST_PORT}/health" >/dev/null 2>&1; then
    api_ok="ok"
  fi
  if service_is_running redis && dc exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
    redis_ok="ok"
  fi
  if curl -sf --max-time 2 "http://${PUBLIC_HOST}:${CADDY_HOST_PORT}/" >/dev/null 2>&1; then
    fe_ok="ok"
  fi
  printf 'Health: API=%s  Redis=%s  Frontend=%s' "$api_ok" "$redis_ok" "$fe_ok"
}

# ── Commands ──────────────────────────────────────────────────────────────────
cmd_validate_config() {
  dc config -q
  printf '%sCompose config valid.%s\n' "$C_GREEN" "$C_RESET"
}

cmd_start_detached() {
  local rc=0
  if [[ "${MENU_QUIET:-0}" == "1" ]]; then
    quiet_dc up --build -d || rc=$?
  else
    dc up --build -d || rc=$?
  fi
  if [[ "$rc" -ne 0 ]]; then
    printf '%sERROR: stack start failed (exit %s).%s\n' "$C_RED" "$rc" "$C_RESET" >&2
    return "$rc"
  fi
  if ! wait_for_stack_ready; then
    cmd_status
    if [[ "${MENU_QUIET:-0}" == "1" ]]; then
      return 1
    fi
  else
    cmd_status
  fi
  printf '\n'
  urls_hint
}

cmd_start_attached() {
  local rc=0
  dc up --build -d || rc=$?
  if [[ "$rc" -ne 0 ]]; then
    printf '%sERROR: stack start failed (exit %s).%s\n' "$C_RED" "$rc" "$C_RESET" >&2
    return "$rc"
  fi
  wait_for_stack_ready || true
  printf '%sFollowing logs (Ctrl-C stops tail only)…%s\n' "$C_DIM" "$C_RESET"
  dc logs -f --tail=200
}

cmd_stop() {
  local rc=0
  if [[ "${MENU_QUIET:-0}" == "1" ]]; then
    quiet_dc down || rc=$?
  else
    dc down || rc=$?
  fi
  if [[ "$rc" -ne 0 ]]; then
    printf '%sERROR: stack stop failed (exit %s).%s\n' "$C_RED" "$rc" "$C_RESET" >&2
    return "$rc"
  fi
  printf '%sStack stopped (volumes kept).%s\n' "$C_GREEN" "$C_RESET"
}

cmd_restart() {
  cmd_stop || return 1
  cmd_start_detached
}

cmd_status() {
  dc ps -a
  printf '\n%s%s%s\n' "$C_DIM" "$(health_summary_line)" "$C_RESET"
}

cmd_logs_all() {
  require_stack_running || return 1
  dc logs -f --tail=200
}

cmd_logs_service() {
  local svc="$1"
  require_service_running "$svc" || return 1
  dc logs -f --tail=200 "$svc"
}

cmd_health() {
  require_stack_running || return 1
  printf '%s=== HTTP health ===%s\n' "$C_BOLD" "$C_RESET"
  curl -sf "http://${PUBLIC_HOST}:${CADDY_HOST_PORT}/health" && printf '\n' || printf 'FAIL: /health\n' >&2
  printf '\n%s=== Redis ===%s\n' "$C_BOLD" "$C_RESET"
  if require_service_running redis; then
    dc exec -T redis redis-cli ping || true
  fi
  printf '\n%s=== Compose ps ===%s\n' "$C_BOLD" "$C_RESET"
  dc ps
}

cmd_shell_api() {
  require_service_running api || return 1
  dc exec api sh
}

cmd_shell_frontend() {
  require_service_running frontend || return 1
  dc exec frontend sh
}

cmd_shell_service() {
  require_service_running "$1" || return 1
  dc exec "$1" sh
}

cmd_test_frontend() {
  require_service_running frontend || return 1
  dc exec frontend sh -c "cd /app && npm test"
}

cmd_test_api() {
  require_service_running api || return 1
  dc exec api sh -c "cd /app && pytest tests/ -q"
}

cmd_lint_frontend() {
  require_service_running frontend || return 1
  dc exec frontend sh -c "cd /app && npm run lint && npm run typecheck"
}

cmd_lint_api() {
  require_service_running api || return 1
  dc exec api sh -c "cd /app && ruff check . && pyright ."
}

cmd_e2e_offline() {
  "$REPO_ROOT/bin/e2e-offline.sh"
}

cmd_e2e_handoff() {
  "$REPO_ROOT/bin/e2e-handoff.sh"
}

cmd_pull() {
  dc pull
}

cmd_build_only() {
  dc build --pull
}

cmd_redis_flush() {
  require_service_running redis || return 1
  print_banner "DANGER: Flush Redis (all relay sessions)"
  printf 'This deletes all ephemeral pairing sessions in project %s.\n' "$COMPOSE_PROJECT_NAME"
  local confirm
  printf 'Type project name to confirm: ' >&2
  read -r confirm <"${MENU_TTY:-/dev/tty}"
  if [[ "$confirm" != "$COMPOSE_PROJECT_NAME" ]]; then
    printf 'Aborted (name mismatch).\n' >&2
    return 0
  fi
  printf 'Type FLUSH to confirm: ' >&2
  read -r confirm <"${MENU_TTY:-/dev/tty}"
  if [[ "$confirm" != "FLUSH" ]]; then
    printf 'Aborted.\n' >&2
    return 0
  fi
  dc exec -T redis redis-cli FLUSHDB
  printf '%sRedis FLUSHDB complete.%s\n' "$C_GREEN" "$C_RESET"
}

cmd_nuke() {
  print_banner "DANGER: Nuke stack + volumes"
  local confirm
  printf 'Type project name to confirm: ' >&2
  read -r confirm <"${MENU_TTY:-/dev/tty}"
  if [[ "$confirm" != "$COMPOSE_PROJECT_NAME" ]]; then
    printf 'Aborted (name mismatch).\n' >&2
    return 0
  fi
  printf 'Second confirm — type YES to delete volumes: ' >&2
  read -r confirm <"${MENU_TTY:-/dev/tty}"
  if [[ "$confirm" != "YES" ]]; then
    printf 'Aborted.\n' >&2
    return 0
  fi
  dc down -v --remove-orphans
  printf '%sStack removed including volumes.%s\n' "$C_GREEN" "$C_RESET"
}

cmd_help() {
  cat <<EOF
tools-teleprompt stack manager

Context:
  dev          Local development (default)

Interactive:
  ./bin/start.sh
  ./bin/start.sh dev

Headless:
  ./bin/start.sh [dev] start       Build + up detached
  ./bin/start.sh [dev] start-fg    Up detached, then follow logs
  ./bin/start.sh [dev] stop        docker compose down
  ./bin/start.sh [dev] restart     down + up
  ./bin/start.sh [dev] status      ps + health summary
  ./bin/start.sh [dev] validate    compose config -q
  ./bin/start.sh [dev] health       curl /health + redis ping
  ./bin/start.sh [dev] urls         print local URLs
  ./bin/start.sh [dev] logs         all services (follow)
  ./bin/start.sh [dev] logs:<svc>   one service (api|frontend|caddy|redis)
  ./bin/start.sh [dev] shell-api
  ./bin/start.sh [dev] shell-frontend
  ./bin/start.sh [dev] shell:<svc>
  ./bin/start.sh [dev] test-fe | test-api | lint-fe | lint-api
  ./bin/start.sh [dev] e2e-offline | e2e-handoff
  ./bin/start.sh [dev] pull | build
  ./bin/start.sh [dev] redis-flush  (dangerous)
  ./bin/start.sh [dev] nuke         (dangerous — down -v)

CI:
  MENU_QUIET=1 ./bin/start.sh dev start

Env file: ${ENV_FILE:-none}
Project:  ${COMPOSE_PROJECT_NAME}
EOF
}

# ── Menu ──────────────────────────────────────────────────────────────────────
render_menu_header() {
  local running total
  running="$(running_count)"
  total="${#SERVICES[@]}"
  clear >&2 2>/dev/null || printf '\033[2J\033[H' >&2
  printf '%s┌─ tools-teleprompt ─ %s context ─────────────────────────────┐%s\n' "$C_CYAN" "$STACK_CONTEXT" "$C_RESET"
  printf '%s│%s Project: %-20s  Running: %s/%s\n' "$C_CYAN" "$C_RESET" "$COMPOSE_PROJECT_NAME" "$running" "$total"
  printf '%s│%s Stack:   %s-%s  Env file: %s\n' "$C_CYAN" "$C_RESET" "$STACK_NAME" "$STACK_ENV" "${ENV_FILE##*/}"
  printf '%s│%s %s\n' "$C_CYAN" "$C_RESET" "$(health_summary_line)"
  printf '%s└──────────────────────────────────────────────────────────────┘%s\n\n' "$C_CYAN" "$C_RESET"
}

show_menu() {
  render_menu_header
  printf '%sStack%s\n' "$C_BOLD" "$C_RESET"
  printf '  %s1)%s Start (build + detached)\n' "$C_GREEN" "$C_RESET"
  printf '  %s2)%s Start + follow logs\n' "$C_GREEN" "$C_RESET"
  printf '  %s3)%s Stop\n' "$C_GREEN" "$C_RESET"
  printf '  %s4)%s Restart\n' "$C_GREEN" "$C_RESET"
  printf '  %s5)%s Status\n' "$C_GREEN" "$C_RESET"
  printf '  %s6)%s Validate compose config\n' "$C_GREEN" "$C_RESET"
  printf '\n%sLogs & health%s\n' "$C_BOLD" "$C_RESET"
  printf '  %s7)%s Logs (all services)\n' "$C_GREEN" "$C_RESET"
  printf '  %s8)%s Logs — pick service\n' "$C_GREEN" "$C_RESET"
  printf '  %s9)%s Health check\n' "$C_GREEN" "$C_RESET"
  printf ' %s10)%s Show URLs\n' "$C_GREEN" "$C_RESET"
  printf '\n%sDevelopment%s\n' "$C_BOLD" "$C_RESET"
  printf ' %s11)%s Shell — API\n' "$C_GREEN" "$C_RESET"
  printf ' %s12)%s Shell — frontend\n' "$C_GREEN" "$C_RESET"
  printf ' %s13)%s Shell — pick service\n' "$C_GREEN" "$C_RESET"
  printf ' %s14)%s Test frontend (vitest)\n' "$C_GREEN" "$C_RESET"
  printf ' %s15)%s Test API (pytest)\n' "$C_GREEN" "$C_RESET"
  printf ' %s16)%s Lint + typecheck (frontend)\n' "$C_GREEN" "$C_RESET"
  printf ' %s17)%s Lint + typecheck (API)\n' "$C_GREEN" "$C_RESET"
  printf ' %s18)%s E2E offline (Playwright image)\n' "$C_GREEN" "$C_RESET"
  printf ' %s19)%s E2E handoff (Playwright image)\n' "$C_GREEN" "$C_RESET"
  printf ' %s20)%s Pull images\n' "$C_GREEN" "$C_RESET"
  printf ' %s21)%s Build only\n' "$C_GREEN" "$C_RESET"
  printf '\n%sDanger zone%s\n' "$C_BOLD" "$C_RED"
  printf ' %s22)%s Redis FLUSHDB (relay sessions)\n' "$C_RED" "$C_RESET"
  printf ' %s23)%s Nuke stack + volumes\n' "$C_RED" "$C_RESET"
  printf '\n  %s0)%s Exit   %sr)%s Refresh   %s?%s Help\n\n' "$C_DIM" "$C_RESET" "$C_DIM" "$C_RESET" "$C_DIM" "$C_RESET"
}

pick_service() {
  local i svc
  printf 'Services: ' >&2
  for i in "${!SERVICES[@]}"; do
    printf '%s=%s ' "$((i + 1))" "${SERVICES[$i]}" >&2
  done
  printf '\nPick number: ' >&2
  read -r i <"${MENU_TTY:-/dev/tty}"
  if [[ "$i" =~ ^[0-9]+$ ]] && (( i >= 1 && i <= ${#SERVICES[@]} )); then
    svc="${SERVICES[$((i - 1))]}"
    printf '%s' "$svc"
    return 0
  fi
  return 1
}

dispatch_menu_choice() {
  local choice="$1" svc rc=0
  set +e
  case "$choice" in
    1)  cmd_start_detached; rc=$? ;;
    2)  cmd_start_attached; rc=$? ;;
    3)  cmd_stop; rc=$? ;;
    4)  cmd_restart; rc=$? ;;
    5)  cmd_status ;;
    6)  cmd_validate_config ;;
    7)  cmd_logs_all; rc=$? ;;
    8)
      if svc="$(pick_service)"; then cmd_logs_service "$svc"; rc=$?; else printf 'Invalid service.\n' >&2; fi
      ;;
    9)  cmd_health ;;
    10) urls_hint ;;
    11) cmd_shell_api; rc=$? ;;
    12) cmd_shell_frontend; rc=$? ;;
    13)
      if svc="$(pick_service)"; then cmd_shell_service "$svc"; rc=$?; else printf 'Invalid service.\n' >&2; fi
      ;;
    14) cmd_test_frontend; rc=$? ;;
    15) cmd_test_api; rc=$? ;;
    16) cmd_lint_frontend; rc=$? ;;
    17) cmd_lint_api; rc=$? ;;
    18) cmd_e2e_offline; rc=$? ;;
    19) cmd_e2e_handoff; rc=$? ;;
    20) cmd_pull; rc=$? ;;
    21) cmd_build_only; rc=$? ;;
    22) cmd_redis_flush ;;
    23) cmd_nuke ;;
    0|q|Q) return 2 ;;
    r|R) return 0 ;;
    \?|h|H) cmd_help; pause_menu; return 0 ;;
    *) printf 'Unknown choice: %s\n' "$choice" >&2; rc=1 ;;
  esac
  set -e
  [[ "$choice" == "2" || "$choice" == "7" || "$choice" == "11" || "$choice" == "12" || "$choice" == "13" ]] && return "$rc"
  [[ "$rc" -ne 0 ]] && printf '%sCommand exited with status %s%s\n' "$C_RED" "$rc" "$C_RESET" >&2
  pause_menu
  return 0
}

run_menu() {
  local choice rc=0
  init_menu_tty
  while true; do
    show_menu
    printf '%sChoice:%s ' "$C_BOLD" "$C_RESET" >&2
    read -r choice <"${MENU_TTY:-/dev/tty}" || exit 0
    rc=0
    dispatch_menu_choice "$choice" || rc=$?
    [[ "$rc" -eq 2 ]] && break
  done
}

# ── Context + CLI dispatch ────────────────────────────────────────────────────
is_context() {
  case "$1" in
    dev) return 0 ;;
    *) return 1 ;;
  esac
}

apply_context() {
  case "$STACK_CONTEXT" in
    dev)
      STACK_ENV="dev"
      ;;
    *)
      printf 'ERROR: Unknown context: %s\n' "$STACK_CONTEXT" >&2
      exit 1
      ;;
  esac
}

reconcile_stack_identity() {
  [[ -n "$COMPOSE_PROJECT_NAME" ]] || COMPOSE_PROJECT_NAME="${STACK_NAME}-${STACK_ENV}"
}

dispatch_cli() {
  local cmd="${1:-}" svc
  case "$cmd" in
    start)       cmd_start_detached ;;
    start-fg)    cmd_start_attached ;;
    stop)        cmd_stop ;;
    restart)     cmd_restart ;;
    status)      cmd_status ;;
    validate)    cmd_validate_config ;;
    health)      cmd_health ;;
    urls)        urls_hint ;;
    logs)        cmd_logs_all ;;
    logs:*)
      svc="${cmd#logs:}"
      if valid_service "$svc"; then
        cmd_logs_service "$svc"
      else
        printf '%sERROR: Unknown service %q for logs. Valid: %s%s\n' \
          "$C_RED" "$svc" "${SERVICES[*]}" "$C_RESET" >&2
        exit 1
      fi
      ;;
    shell-api)   cmd_shell_api ;;
    shell-frontend) cmd_shell_frontend ;;
    shell:*)
      svc="${cmd#shell:}"
      if valid_service "$svc"; then
        cmd_shell_service "$svc"
      else
        printf '%sERROR: Unknown service %q for shell. Valid: %s%s\n' \
          "$C_RED" "$svc" "${SERVICES[*]}" "$C_RESET" >&2
        exit 1
      fi
      ;;
    test-fe)     cmd_test_frontend ;;
    test-api)    cmd_test_api ;;
    lint-fe)     cmd_lint_frontend ;;
    lint-api)    cmd_lint_api ;;
    e2e-offline) cmd_e2e_offline ;;
    e2e-handoff) cmd_e2e_handoff ;;
    pull)        cmd_pull ;;
    build)       cmd_build_only ;;
    redis-flush) cmd_redis_flush ;;
    nuke)        cmd_nuke ;;
    menu|dev)    run_menu ;;
    ""|help|-h|--help) cmd_help ;;
    *)
      printf 'ERROR: Unknown command: %s\n' "$cmd" >&2
      cmd_help >&2
      exit 1
      ;;
  esac
}

require_repo_layout() {
  local d
  for d in api frontend deploy; do
    if [[ ! -d "$REPO_ROOT/$d" ]]; then
      printf '%sERROR: Expected directory missing: %s/%s%s\n' "$C_RED" "$REPO_ROOT" "$d" "$C_RESET" >&2
      exit 1
    fi
  done
}

main() {
  require_docker
  require_compose_file
  require_repo_layout
  load_env
  init_menu_tty

  local args=("$@")

  # ./bin/start.sh dev start  → context + command
  if [[ ${#args[@]} -gt 0 ]] && is_context "${args[0]}"; then
    STACK_CONTEXT="${args[0]}"
    apply_context
    args=("${args[@]:1}")
  fi
  reconcile_stack_identity

  if [[ ${#args[@]} -eq 0 ]]; then
    run_menu
    return 0
  fi

  dispatch_cli "${args[0]}"
  if [[ ${#args[@]} -gt 1 ]]; then
    printf 'WARN: Ignoring extra arguments: %s\n' "${args[*]:1}" >&2
  fi
}

main "$@"
