#!/usr/bin/env bash
# CoopGig local stack launcher
#   ./start.sh            dev mode: docker infra + native node (API + 3 SPAs)
#   ./start.sh --docker   full container stack (nginx on 8080 / 8081 / 8082)
#   ./start.sh --seed     dev mode, run migrations + seed before booting the API
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/logs"
RUN_DIR="$ROOT/.run"
mkdir -p "$LOG_DIR" "$RUN_DIR"

E=$'\033[0m'; OK=$'\033[32m'; WARN=$'\033[33m'; ERR=$'\033[31m'; DIM=$'\033[2m'
say()  { printf '%s==>%s %s\n' "$OK" "$E" "$*"; }
note() { printf '%s   -%s %s\n' "$DIM" "$E" "$*"; }
warn() { printf '%s   !%s %s\n' "$WARN" "$E" "$*"; }
die()  { printf '%s   x%s %s\n' "$ERR" "$E" "$*" >&2; exit 1; }

envval() { sed -n "s/^$1=//p" "$ROOT/backend/.env" 2>/dev/null | tail -1 | tr -d '\r'; }
API_PORT="$(envval PORT)";            API_PORT="${API_PORT:-4000}"
PG_PORT="$(envval DATABASE_URL | sed -n 's/.*:\([0-9]\{2,5\}\)\/.*/\1/p')"; PG_PORT="${PG_PORT:-5432}"
REDIS_PORT="$(envval REDIS_URL | sed -n 's/.*:\([0-9]\{2,5\}\).*/\1/p')"; REDIS_PORT="${REDIS_PORT:-6379}"
DOCKER_MODE=0; SEED=0
for a in "$@"; do
  case "$a" in
    --docker) DOCKER_MODE=1 ;;
    --seed)   SEED=1 ;;
    -h|--help) sed -n '2,6p' "$0"; exit 0 ;;
  esac
done

port_open() {
  node -e 'const s=require("net").connect({host:"127.0.0.1",port:+process.argv[1]});
    s.setTimeout(1500,()=>{s.destroy();process.exit(1)});
    s.on("connect",()=>{s.destroy();process.exit(0)});
    s.on("error",()=>process.exit(1));' "$1" 2>/dev/null
}

wait_port() { # port label timeout
  local i=0
  while [ "$i" -lt "${3:-60}" ]; do
    port_open "$1" && { note "$2 ready on $1"; return 0; }
    i=$((i + 1)); sleep 1
  done
  return 1
}

docker_ok()   { docker info >/dev/null 2>&1; }
compose_ok()  { docker compose version >/dev/null 2>&1; }
dc() {
  if compose_ok; then
    docker compose -f "$ROOT/docker-compose.yml" -f "$ROOT/docker-compose.dev.yml" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$ROOT/docker-compose.yml" -f "$ROOT/docker-compose.dev.yml" "$@"
  else
    die "docker compose not available"
  fi
}

ensure_docker() {
  docker_ok && return 0
  local exe found=0
  for exe in "/c/Program Files/Docker/Docker/Docker Desktop.exe" \
             "$LOCALAPPDATA/Docker/Docker Desktop.exe" \
             "$PROGRAMFILES/Docker/Docker/Docker Desktop.exe"; do
    if [ -f "$exe" ]; then say "Docker daemon not running - launching Docker Desktop"; "$exe" >/dev/null 2>&1 &
      found=1; break
    fi
  done
  [ "$found" -eq 1 ] || die "Docker Desktop not found. Start it manually, or run PostgreSQL + Redis yourself."
  local i=0
  while [ "$i" -lt 90 ]; do docker_ok && { note "docker daemon up"; return 0; }; i=$((i+1)); sleep 1; done
  die "docker daemon did not come up in 90s"
}

start_bg() { # name dir cmd...
  local name="$1" dir="$2"; shift 2
  ( cd "$dir" && exec "$@" ) > "$LOG_DIR/$name.log" 2>&1 &
  local pid=$!
  echo "$pid" > "$RUN_DIR/$name.pid"
  say "$name started (pid $pid) - logs/$name.log"
}

summary() {
  cat <<EOF

  ${OK}CoopGig is running${E}
  ${DIM}------------------------------------------------${E}
   API        http://localhost:$API_PORT/api
   Customer   http://localhost:5173
   Worker     http://localhost:5174
   Admin      http://localhost:5175/login
   ${DIM}------------------------------------------------${E}
   Logs       $LOG_DIR/*.log
   Stop       ./stop.sh
EOF
}

if [ "$DOCKER_MODE" -eq 1 ]; then
  ensure_docker
  say "building and starting the full container stack (first run takes a few minutes)"
  dc up --build -d || die "docker compose up failed"
  dc ps
  summary
  note "customer/worker/admin are served by nginx on 8080 / 8081 / 8082 (stop with ./stop.sh --docker)"
  exit 0
fi

say "1/4  infrastructure"
ensure_docker

if port_open "$PG_PORT"; then
  note "postgres already listening on $PG_PORT"
else
  say "starting postgres container"
  dc up -d postgres || die "could not start postgres"
  wait_port "$PG_PORT" postgres 60 || die "postgres never opened $PG_PORT"
fi

if port_open "$REDIS_PORT"; then
  note "redis already listening on $REDIS_PORT"
else
  say "starting redis container"
  dc up -d redis || die "could not start redis"
  wait_port "$REDIS_PORT" redis 45 || die "redis never opened $REDIS_PORT"
fi

if [ "$SEED" -eq 1 ]; then
  say "running migrations + seed (this resets demo data)"
  ( cd "$ROOT/backend" && npm run db:init ) || die "db:init failed"
fi

say "2/4  api (tsx watch on $API_PORT)"
if port_open "$API_PORT"; then
  note "api already listening on $API_PORT"
else
  start_bg backend "$ROOT/backend" npm run dev
  ok=0
  for i in $(seq 1 60); do
    if node -e "fetch('http://localhost:$API_PORT/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
      ok=1; break
    fi
    sleep 1
  done
  [ "$ok" -eq 1 ] || { warn "api did not report healthy in 60s - check $LOG_DIR/backend.log"; tail -n 15 "$LOG_DIR/backend.log"; }
fi

say "3/4  web apps (vite)"
for app in customer:5173 worker:5174 admin:5175; do
  name="${app%%:*}"; port="${app##*:}"
  if port_open "$port"; then
    note "$name already listening on $port"
  else
    start_bg "$name" "$ROOT/client/$name" npm run dev
    wait_port "$port" "$name" 45 || warn "$name did not open $port - check $LOG_DIR/$name.log"
  fi
done

say "4/4  done"
summary
