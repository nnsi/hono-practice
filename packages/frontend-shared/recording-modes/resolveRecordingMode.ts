import {
  RECORDING_MODES,
  type RecordingMode,
} from "@packages/domain/activity/recordingMode";
import { isTimeUnit } from "@packages/domain/time/timeUtils";

import type { ActivityBase } from "./types";

const RECORDING_MODE_SET: ReadonlySet<string> = new Set(RECORDING_MODES);

function isRecordingMode(value: string): value is RecordingMode {
  return RECORDING_MODE_SET.has(value);
}

/**
 * activity から recordingMode を解決する。
 * recordingMode が未設定の既存データは quantityUnit から推論（fallback）。
 */
export function resolveRecordingMode(activity: ActivityBase): RecordingMode {
  if (activity.recordingMode && isRecordingMode(activity.recordingMode)) {
    return activity.recordingMode;
  }
  if (isTimeUnit(activity.quantityUnit)) {
    return "timer";
  }
  return "manual";
}
