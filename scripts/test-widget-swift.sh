#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WIDGET_DIR="$ROOT_DIR/apps/mobile/targets/widget"
TEST_BIN="${TMPDIR:-/tmp}/actiko-widget-swift-tests"
trap 'rm -f "$TEST_BIN"' EXIT

xcrun swiftc \
  "$WIDGET_DIR/AppConfig.swift" \
  "$WIDGET_DIR/TimeConversion.swift" \
  "$WIDGET_DIR/TimerState.swift" \
  "$WIDGET_DIR/TimerSavePolicy.swift" \
  "$WIDGET_DIR/WidgetPlanPolicy.swift" \
  "$WIDGET_DIR/WidgetSaveError.swift" \
  "$WIDGET_DIR/UuidV7.swift" \
  "$WIDGET_DIR/WidgetDbHelper.swift" \
  "$WIDGET_DIR/WidgetActivityQueries.swift" \
  "$WIDGET_DIR/WidgetActivityLogWriter.swift" \
  "$WIDGET_DIR/WidgetConfigParser.swift" \
  "$WIDGET_DIR/SaveLogHelper.swift" \
  "$WIDGET_DIR/SimpleLogHelper.swift" \
  "$WIDGET_DIR/VoiceRecordApi.swift" \
  "$ROOT_DIR/scripts/widget-swift-tests/WidgetNativeTests.swift" \
  -o "$TEST_BIN"

"$TEST_BIN"

IPHONE_SIMULATOR_SDK="$(xcrun --sdk iphonesimulator --show-sdk-path)"
xcrun --sdk iphonesimulator swiftc \
  "$WIDGET_DIR"/*.swift \
  -typecheck \
  -parse-as-library \
  -sdk "$IPHONE_SIMULATOR_SDK" \
  -target arm64-apple-ios17.0-simulator
