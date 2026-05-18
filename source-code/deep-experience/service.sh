#!/usr/bin/env bash
set -euo pipefail

# DeepExperience Service Manager
# Usage: ./service.sh {start|stop|restart|status} [backend|mobile|all]
#
# Note: Guest web is now served by the backend (same port 8001).
#       The old "web" service (Expo Web on port 8000) has been removed.
#       Mobile app is currently frozen — use "mobile" only if needed.

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$PROJECT_ROOT/.pids"
LOG_DIR="$PROJECT_ROOT/.logs"

BACKEND_PORT=8001
MOBILE_PORT=8081

mkdir -p "$PID_DIR" "$LOG_DIR"

# ---------- helpers ----------

_color() {
  local color="$1"; shift
  case "$color" in
    green)  printf "\033[32m%s\033[0m" "$*" ;;
    red)    printf "\033[31m%s\033[0m" "$*" ;;
    yellow) printf "\033[33m%s\033[0m" "$*" ;;
    cyan)   printf "\033[36m%s\033[0m" "$*" ;;
    *)      printf "%s" "$*" ;;
  esac
}

_is_running() {
  local pidfile="$PID_DIR/$1.pid"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    # stale pid file
    rm -f "$pidfile"
  fi
  return 1
}

_get_pid() {
  local pidfile="$PID_DIR/$1.pid"
  [[ -f "$pidfile" ]] && cat "$pidfile"
}

# ---------- start ----------

start_backend() {
  if _is_running backend; then
    echo "  backend: $(_color yellow "already running") (PID $(_get_pid backend))"
    return 0
  fi
  echo -n "  backend: starting..."
  cd "$PROJECT_ROOT"
  nohup pnpm --filter backend dev > "$LOG_DIR/backend.log" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_DIR/backend.pid"
  # wait a moment for the server to initialise
  sleep 2
  if kill -0 "$pid" 2>/dev/null; then
    echo " $(_color green "started") (PID $pid, port $BACKEND_PORT)"
    echo "  log: $LOG_DIR/backend.log"
  else
    echo " $(_color red "failed") — check $LOG_DIR/backend.log"
    rm -f "$PID_DIR/backend.pid"
    return 1
  fi
}

start_mobile() {
  if _is_running mobile; then
    echo "  mobile:  $(_color yellow "already running") (PID $(_get_pid mobile))"
    return 0
  fi
  echo -n "  mobile:  starting..."
  cd "$PROJECT_ROOT"
  CI=1 nohup pnpm --filter mobile start > "$LOG_DIR/mobile.log" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_DIR/mobile.pid"
  sleep 2
  if kill -0 "$pid" 2>/dev/null; then
    echo " $(_color green "started") (PID $pid, port $MOBILE_PORT)"
    echo "  log: $LOG_DIR/mobile.log"
  else
    echo " $(_color red "failed") — check $LOG_DIR/mobile.log"
    rm -f "$PID_DIR/mobile.pid"
    return 1
  fi
}

# web service removed — guest web is now part of backend (port 8001)

# ---------- stop ----------

_kill_tree() {
  local pid="$1"
  # kill child processes first
  local children
  children=$(pgrep -P "$pid" 2>/dev/null || true)
  for child in $children; do
    _kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

stop_backend() {
  if ! _is_running backend; then
    echo "  backend: $(_color yellow "not running")"
    return 0
  fi
  local pid
  pid=$(_get_pid backend)
  echo -n "  backend: stopping (PID $pid)..."
  _kill_tree "$pid"
  rm -f "$PID_DIR/backend.pid"
  echo " $(_color green "stopped")"
}

stop_mobile() {
  if ! _is_running mobile; then
    echo "  mobile:  $(_color yellow "not running")"
    return 0
  fi
  local pid
  pid=$(_get_pid mobile)
  echo -n "  mobile:  stopping (PID $pid)..."
  _kill_tree "$pid"
  rm -f "$PID_DIR/mobile.pid"
  echo " $(_color green "stopped")"
}

# stop_web removed — guest web is now part of backend

# ---------- status ----------

show_status() {
  echo ""
  echo "  DeepExperience Services"
  echo "  ─────────────────────────────────────"

  # backend
  if _is_running backend; then
    echo "  backend  $(_color green "● running")  PID $(_get_pid backend)  port $BACKEND_PORT"
  else
    echo "  backend  $(_color red "○ stopped")"
  fi

  # mobile (frozen — not started by default)
  if _is_running mobile; then
    echo "  mobile   $(_color green "● running")  PID $(_get_pid mobile)  port $MOBILE_PORT"
  else
    echo "  mobile   $(_color yellow "○ frozen")   (use './service.sh start mobile' if needed)"
  fi

  # guest web
  echo "  web      $(_color cyan "→ backend")  served at http://localhost:$BACKEND_PORT"

  echo ""
}

# ---------- main ----------

usage() {
  echo ""
  echo "  Usage: $0 {start|stop|restart|status} [backend|mobile|all]"
  echo ""
  echo "  Commands:"
  echo "    start   [service]   Start service(s)"
  echo "    stop    [service]   Stop service(s)"
  echo "    restart [service]   Restart service(s)"
  echo "    status              Show running status"
  echo "    logs    [service]   Tail logs (Ctrl-C to exit)"
  echo ""
  echo "  'all' starts backend only (mobile is frozen, guest web is part of backend)."
  echo "  Use 'mobile' explicitly if you need the Expo app."
  echo ""
}

CMD="${1:-}"
TARGET="${2:-all}"

case "$CMD" in
  start)
    echo ""
    echo "  Starting services..."
    if [[ "$TARGET" == "all" || "$TARGET" == "backend" ]]; then start_backend; fi
    if [[ "$TARGET" == "mobile" ]];  then start_mobile;  fi
    echo ""
    ;;
  stop)
    echo ""
    echo "  Stopping services..."
    if [[ "$TARGET" == "all" || "$TARGET" == "backend" ]]; then stop_backend; fi
    if [[ "$TARGET" == "all" || "$TARGET" == "mobile" ]];  then stop_mobile;  fi
    echo ""
    ;;
  restart)
    echo ""
    echo "  Restarting services..."
    if [[ "$TARGET" == "all" || "$TARGET" == "backend" ]]; then stop_backend; start_backend; fi
    if [[ "$TARGET" == "mobile" ]];  then stop_mobile;  start_mobile;  fi
    echo ""
    ;;
  status)
    show_status
    ;;
  logs)
    if [[ "$TARGET" == "all" ]]; then
      tail -f "$LOG_DIR/backend.log" 2>/dev/null
    else
      tail -f "$LOG_DIR/$TARGET.log" 2>/dev/null
    fi
    ;;
  *)
    usage
    exit 1
    ;;
esac
