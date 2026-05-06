#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_PATH="${APP_PATH:-$ROOT_DIR/apps/mobile/build/ios-sim/Actiko.app}"
APP_ID="${APP_ID:-com.actiko.app}"
FLOW="${FLOW:-$ROOT_DIR/apps/mobile/.maestro/smoke.yaml}"
DEVICE_ID="${DEVICE_ID:-}"
BACKEND_PORT="${BACKEND_PORT:-3536}"
BACKEND_LOG="${BACKEND_LOG:-/tmp/mobile-e2e-server.log}"

if ! command -v maestro >/dev/null 2>&1; then
  echo "[mobile-e2e] maestro CLI not found in PATH. install via 'curl -Ls https://get.maestro.mobile.dev | bash'" >&2
  exit 1
fi

if [ ! -d "$APP_PATH" ]; then
  echo "[mobile-e2e] app artifact missing at $APP_PATH" >&2
  echo "[mobile-e2e] run 'pnpm mobile:e2e:build' first to produce the e2e-local-ios build" >&2
  exit 1
fi

if [ -z "$DEVICE_ID" ]; then
  DEVICE_ID="$(xcrun simctl list devices booted -j | python3 -c '
import json, sys
data = json.load(sys.stdin)
for runtime in data.get("devices", {}).values():
    for d in runtime:
        if d.get("state") == "Booted":
            print(d["udid"]); sys.exit(0)
')"
fi

if [ -z "$DEVICE_ID" ]; then
  echo "[mobile-e2e] no booted iOS simulator. boot one via Simulator.app first" >&2
  exit 1
fi

echo "[mobile-e2e] device=$DEVICE_ID app=$APP_PATH"

cleanup() {
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Reap stale backend left from a prior run that bypassed the trap (SIGKILL,
# machine sleep, etc.). Otherwise the new backend can't bind :$BACKEND_PORT,
# the readiness loop succeeds against the zombie, and Maestro silently runs
# against an outdated seed.
STALE_PIDS="$(lsof -ti:"$BACKEND_PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$STALE_PIDS" ]; then
  echo "[mobile-e2e] killing stale backend on :$BACKEND_PORT (pid=$STALE_PIDS)"
  for PID in $STALE_PIDS; do kill "$PID" 2>/dev/null || true; done
  for _ in $(seq 1 5); do
    if [ -z "$(lsof -ti:"$BACKEND_PORT" -sTCP:LISTEN 2>/dev/null || true)" ]; then
      break
    fi
    sleep 1
  done
  REMAINING="$(lsof -ti:"$BACKEND_PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$REMAINING" ]; then
    for PID in $REMAINING; do kill -9 "$PID" 2>/dev/null || true; done
  fi
fi

echo "[mobile-e2e] starting backend on :$BACKEND_PORT"
(cd "$ROOT_DIR" && API_PORT="$BACKEND_PORT" pnpm mobile:e2e:server) >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo "[mobile-e2e] waiting for backend"
for _ in $(seq 1 60); do
  if curl -sf "http://localhost:$BACKEND_PORT/" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "[mobile-e2e] backend exited early. log:" >&2
    cat "$BACKEND_LOG" >&2
    exit 1
  fi
  sleep 1
done

if ! curl -sf "http://localhost:$BACKEND_PORT/" >/dev/null 2>&1; then
  echo "[mobile-e2e] backend did not become ready" >&2
  exit 1
fi

echo "[mobile-e2e] (re)installing app"
xcrun simctl uninstall "$DEVICE_ID" "$APP_ID" >/dev/null 2>&1 || true
xcrun simctl install "$DEVICE_ID" "$APP_PATH"

echo "[mobile-e2e] running maestro: $FLOW"
maestro --device "$DEVICE_ID" test "$FLOW"
