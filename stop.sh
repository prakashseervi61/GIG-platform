#!/usr/bin/env bash
# CoopGig local stack stopper
#   ./stop.sh             stop API + 3 vite apps (postgres/redis keep running)
#   ./stop.sh --docker    also stop the full container stack
#   ./stop.sh --volumes   with --docker, also delete the postgres/redis volumes
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT/.run"
API_PORT="$(sed -n 's/^PORT=//p' "$ROOT/backend/.env" 2>/dev/null | tail -1 | tr -d '\r')"; API_PORT="${API_PORT:-4000}"

E=$'\033[0m'; OK=$'\033[32m'; ERR=$'\033[31m'; DIM=$'\033[2m'; WARN=$'\033[33m'
say()  { printf '%s==>%s %s\n' "$OK" "$E" "$*"; }
note() { printf '%s   -%s %s\n' "$DIM" "$E" "$*"; }
warn() { printf '%s   !%s %s\n' "$WARN" "$E" "$*"; }
die()  { printf '%s   x%s %s\n' "$ERR" "$E" "$*" >&2; exit 1; }

DOCKER_MODE=0; VOLUMES=0
for a in "$@"; do
  case "$a" in
    --docker)  DOCKER_MODE=1 ;;
    --volumes) VOLUMES=1 ;;
    -h|--help) sed -n '2,5p' "$0"; exit 0 ;;
  esac
done

kill_tree() { # pid
  MSYS_NO_PATHCONV=1 taskkill /PID "$1" /T /F >/dev/null 2>&1
}

pids_on_port() {
  netstat -ano 2>/dev/null \
    | awk -v pat=":$1\$" '$4 == "LISTENING" && $2 ~ pat { print $5 }' \
    | sort -un
}

is_node() {
  MSYS_NO_PATHCONV=1 tasklist /FI "PID eq $1" /FO CSV /NH 2>/dev/null | grep -qi '"node.exe"'
}

stop_port() { # port label
  local port="$1" label="$2" pid stopped=0
  for pid in $(pids_on_port "$port"); do
    if is_node "$pid"; then
      kill_tree "$pid" && stopped=1 && note "$label stopped (pid $pid, port $port)"
    else
      warn "port $port is held by a non-node process (pid $pid) - left alone"
    fi
  done
  [ "$stopped" -eq 1 ] || note "$label not running"
}

say "stopping app processes"
for f in "$RUN_DIR"/*.pid; do
  [ -e "$f" ] || continue
  pid="$(cat "$f" 2>/dev/null | tr -d '\r\n ')"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill_tree "$pid" || warn "could not kill pid $pid from $(basename "$f" .pid)"
  fi
  rm -f "$f"
done

say "sweeping ports"
stop_port "$API_PORT" api
stop_port 5173 customer
stop_port 5174 worker
stop_port 5175 admin

if [ "$DOCKER_MODE" -eq 1 ]; then
  if docker info >/dev/null 2>&1; then
    say "stopping container stack"
    DCF=(-f "$ROOT/docker-compose.yml" -f "$ROOT/docker-compose.dev.yml")
    if [ "$VOLUMES" -eq 1 ]; then
      docker compose "${DCF[@]}" down -v || warn "docker compose down -v reported errors"
    else
      docker compose "${DCF[@]}" down || warn "docker compose down reported errors"
    fi
  else
    warn "docker daemon is not running - nothing to stop there"
  fi
else
  note "postgres/redis left running (use ./stop.sh --docker to stop those too)"
fi

say "stopped"
