#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_PATH="${APK_PATH:-$ROOT_DIR/apps/mobile/build/android/actiko-e2e.apk}"
APP_ID="${APP_ID:-com.actiko.app}"
FLOW="${FLOW:-$ROOT_DIR/apps/mobile/.maestro/smoke.yaml}"
BACKEND_PORT="${BACKEND_PORT:-3536}"
BACKEND_LOG="${BACKEND_LOG:-/tmp/mobile-e2e-server.log}"

ANDROID_HOME_DEFAULT="$HOME/Library/Android/sdk"
export ANDROID_HOME="${ANDROID_HOME:-$ANDROID_HOME_DEFAULT}"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"

if ! command -v adb >/dev/null 2>&1; then
  echo "[mobile-e2e-android] adb not found. ensure ANDROID_HOME points at the Android SDK" >&2
  exit 1
fi

if ! command -v maestro >/dev/null 2>&1; then
  echo "[mobile-e2e-android] maestro CLI not found in PATH. install via 'curl -Ls https://get.maestro.mobile.dev | bash'" >&2
  exit 1
fi

if [ ! -f "$APK_PATH" ]; then
  echo "[mobile-e2e-android] APK missing at $APK_PATH" >&2
  echo "[mobile-e2e-android] run 'pnpm mobile:e2e:build:android' first to produce the e2e-local-android build" >&2
  exit 1
fi

DEVICE_ID="${DEVICE_ID:-$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')}"
if [ -z "$DEVICE_ID" ]; then
  echo "[mobile-e2e-android] no booted Android emulator. boot one via 'emulator -avd <name>' first" >&2
  exit 1
fi

echo "[mobile-e2e-android] device=$DEVICE_ID apk=$APK_PATH"

cleanup() {
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "[mobile-e2e-android] starting backend on :$BACKEND_PORT"
(cd "$ROOT_DIR" && API_PORT="$BACKEND_PORT" pnpm mobile:e2e:server) >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo "[mobile-e2e-android] waiting for backend"
for _ in $(seq 1 60); do
  if curl -sf "http://localhost:$BACKEND_PORT/" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "[mobile-e2e-android] backend exited early. log:" >&2
    cat "$BACKEND_LOG" >&2
    exit 1
  fi
  sleep 1
done

if ! curl -sf "http://localhost:$BACKEND_PORT/" >/dev/null 2>&1; then
  echo "[mobile-e2e-android] backend did not become ready" >&2
  exit 1
fi

echo "[mobile-e2e-android] (re)installing APK"
adb -s "$DEVICE_ID" uninstall "$APP_ID" >/dev/null 2>&1 || true
adb -s "$DEVICE_ID" install -r "$APK_PATH"

echo "[mobile-e2e-android] running maestro: $FLOW"
maestro --device "$DEVICE_ID" test "$FLOW"
