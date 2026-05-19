#!/usr/bin/env bash
set -uo pipefail

# Run every top-level Maestro suite under apps/mobile/.maestro/*.yaml against
# the installed e2e iOS sim artifact, reusing a single backend process and
# reinstalling the app between suites so state is clean.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAESTRO_DIR="$ROOT_DIR/apps/mobile/.maestro"
APP_PATH="${APP_PATH:-$ROOT_DIR/apps/mobile/build/ios-sim/Actiko.app}"
APP_ID="${APP_ID:-com.actiko.app}"
DEVICE_ID="${DEVICE_ID:-}"
BACKEND_PORT="${BACKEND_PORT:-3536}"
BACKEND_LOG="${BACKEND_LOG:-/tmp/mobile-e2e-server.log}"
SUMMARY_LOG="${SUMMARY_LOG:-/tmp/mobile-e2e-all-summary.log}"

if ! command -v maestro >/dev/null 2>&1; then
  echo "[mobile-e2e-all] maestro CLI not found" >&2
  exit 1
fi
if [ ! -d "$APP_PATH" ]; then
  echo "[mobile-e2e-all] app artifact missing at $APP_PATH" >&2
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
  echo "[mobile-e2e-all] no booted iOS simulator" >&2
  exit 1
fi

echo "[mobile-e2e-all] device=$DEVICE_ID app=$APP_PATH"

cleanup() {
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

STALE_PIDS="$(lsof -ti:"$BACKEND_PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$STALE_PIDS" ]; then
  echo "[mobile-e2e-all] killing stale backend on :$BACKEND_PORT (pid=$STALE_PIDS)"
  for PID in $STALE_PIDS; do kill "$PID" 2>/dev/null || true; done
  sleep 2
  REMAINING="$(lsof -ti:"$BACKEND_PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$REMAINING" ]; then
    for PID in $REMAINING; do kill -9 "$PID" 2>/dev/null || true; done
  fi
fi

echo "[mobile-e2e-all] starting backend on :$BACKEND_PORT"
(cd "$ROOT_DIR" && API_PORT="$BACKEND_PORT" pnpm mobile:e2e:server) >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo "[mobile-e2e-all] waiting for backend"
for _ in $(seq 1 60); do
  if curl -sf "http://localhost:$BACKEND_PORT/" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "[mobile-e2e-all] backend exited early" >&2
    cat "$BACKEND_LOG" >&2
    exit 1
  fi
  sleep 1
done
if ! curl -sf "http://localhost:$BACKEND_PORT/" >/dev/null 2>&1; then
  echo "[mobile-e2e-all] backend did not become ready" >&2
  exit 1
fi

SUITES=()
while IFS= read -r line; do
  SUITES+=("$line")
done < <(find "$MAESTRO_DIR" -maxdepth 1 -name "*.yaml" | sort)

: >"$SUMMARY_LOG"
PASS=0
FAIL=0
FAILED_SUITES=()
TOTAL=${#SUITES[@]}
IDX=0

MAX_RETRIES="${MAX_RETRIES:-3}"

restart_backend() {
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  STALE="$(lsof -ti:"$BACKEND_PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$STALE" ]; then
    for PID in $STALE; do kill -9 "$PID" 2>/dev/null || true; done
    sleep 2
  fi
  (cd "$ROOT_DIR" && API_PORT="$BACKEND_PORT" pnpm mobile:e2e:server) >"$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!
  for _ in $(seq 1 60); do
    curl -sf "http://localhost:$BACKEND_PORT/" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

reboot_simulator() {
  pkill -9 -f "maestro-driver-iosUITests-Runner" >/dev/null 2>&1 || true
  xcrun simctl shutdown "$DEVICE_ID" >/dev/null 2>&1 || true
  sleep 2
  xcrun simctl boot "$DEVICE_ID" >/dev/null 2>&1 || true
  sleep 5
}

run_suite_once() {
  local suite="$1"
  xcrun simctl uninstall "$DEVICE_ID" "$APP_ID" >/dev/null 2>&1 || true
  # iOS sim keychain (used by expo-secure-store) persists across reinstalls
  # within the booted device. Reset it so each suite starts logged-out.
  xcrun simctl keychain "$DEVICE_ID" reset >/dev/null 2>&1 || true
  xcrun simctl install "$DEVICE_ID" "$APP_PATH"
  maestro --device "$DEVICE_ID" test "$suite"
}

run_suite_with_retry() {
  local suite="$1"
  local name="$2"
  local attempt
  for attempt in $(seq 1 "$MAX_RETRIES"); do
    if [ "$attempt" -gt 1 ]; then
      echo "===== retry $attempt/$MAX_RETRIES: $name (full reset) ====="
      # Full reset between retries: kill maestro driver, reboot simulator,
      # restart backend. Hermes V1 (SDK 56 preview) crashes are partly
      # state-dependent; isolating each retry maximises the chance of success.
      reboot_simulator
      restart_backend
    fi
    if run_suite_once "$suite"; then
      if [ "$attempt" -gt 1 ]; then
        echo "PASS  $name (retry $attempt)" >>"$SUMMARY_LOG"
      else
        echo "PASS  $name" >>"$SUMMARY_LOG"
      fi
      return 0
    fi
  done
  echo "FAIL  $name (after $MAX_RETRIES attempts)" >>"$SUMMARY_LOG"
  return 1
}

for SUITE in "${SUITES[@]}"; do
  IDX=$((IDX + 1))
  NAME="$(basename "$SUITE")"
  echo
  echo "===== [$IDX/$TOTAL] $NAME ====="

  if run_suite_with_retry "$SUITE" "$NAME"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    FAILED_SUITES+=("$NAME")
  fi
done

echo
echo "===== summary ====="
echo "PASS: $PASS / $TOTAL"
echo "FAIL: $FAIL / $TOTAL"
if [ ${#FAILED_SUITES[@]} -gt 0 ]; then
  echo "failed suites:"
  for s in "${FAILED_SUITES[@]}"; do echo "  - $s"; done
fi
echo "summary log: $SUMMARY_LOG"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
