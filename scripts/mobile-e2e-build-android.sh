#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"
OUT_DIR="$MOBILE_DIR/build/android"
APK_NAME="actiko-e2e.apk"

if ! command -v eas >/dev/null 2>&1; then
  echo "[mobile-e2e-build-android] eas CLI not found. install via 'pnpm add -g eas-cli'" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
TARBALL_DIR="$(mktemp -d)"
trap 'rm -rf "$TARBALL_DIR"' EXIT

echo "[mobile-e2e-build-android] running eas build (profile=e2e-local-android, --local)"
(
  cd "$MOBILE_DIR"
  if command -v mise >/dev/null 2>&1; then
    eval "$(mise env)"
  fi
  pnpm exec dotenv -e .env -- eas build --profile e2e-local-android --platform android --local --non-interactive --output "$TARBALL_DIR/$APK_NAME"
)

cp "$TARBALL_DIR/$APK_NAME" "$OUT_DIR/$APK_NAME"
echo "[mobile-e2e-build-android] installed at $OUT_DIR/$APK_NAME"
