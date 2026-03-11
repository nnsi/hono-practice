import {
  RECORDING_MODES,
  type RecordingMode,
} from "@packages/domain/activity/recordingMode";
import { isTimeUnit } from "@packages/domain/time/timeUtils";

import type { ActivityBase } from "./types";

/**
 * activity から recordingMode を解決する。
 * recordingMode が未設定の既存データは quantityUnit から推論（fallback）。
 */
export function resolveRecordingMode(activity: ActivityBase): RecordingMode {
  if (
    activity.recordingMode &&
    (RECORDING_MODES as readonly string[]).includes(activity.recordingMode)
  ) {
    return activity.recordingMode as RecordingMode;
  }
  if (isTimeUnit(activity.quantityUnit)) {
    return "timer";
  }
  return "manual";
}
