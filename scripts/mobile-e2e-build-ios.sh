#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"
OUT_DIR="$MOBILE_DIR/build/ios-sim"
APP_NAME="Actiko.app"

if ! command -v eas >/dev/null 2>&1; then
  echo "[mobile-e2e-build] eas CLI not found. install via 'pnpm add -g eas-cli'" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
TARBALL_DIR="$(mktemp -d)"
trap 'rm -rf "$TARBALL_DIR"' EXIT

echo "[mobile-e2e-build] running eas build (profile=e2e-local-ios, --local)"
(cd "$MOBILE_DIR" && pnpm exec dotenv -e .env -- eas build --profile e2e-local-ios --platform ios --local --non-interactive --output "$TARBALL_DIR/build.tar.gz")

echo "[mobile-e2e-build] extracting artifact"
tar -xzf "$TARBALL_DIR/build.tar.gz" -C "$TARBALL_DIR"

SRC_APP="$(find "$TARBALL_DIR" -maxdepth 3 -name "$APP_NAME" -type d | head -1)"
if [ -z "$SRC_APP" ]; then
  echo "[mobile-e2e-build] could not locate $APP_NAME inside the build artifact" >&2
  exit 1
fi

rm -rf "$OUT_DIR/$APP_NAME"
cp -R "$SRC_APP" "$OUT_DIR/$APP_NAME"
echo "[mobile-e2e-build] installed at $OUT_DIR/$APP_NAME"
