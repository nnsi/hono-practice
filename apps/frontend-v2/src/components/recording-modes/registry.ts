import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";

import { CounterMode } from "./modes/CounterMode";
import { ManualMode } from "./modes/ManualMode";
import { TimerMode } from "./modes/TimerMode";

const modes: Record<RecordingMode, React.ComponentType<RecordingModeProps>> = {
  manual: ManualMode,
  timer: TimerMode,
  counter: CounterMode,
  binary: ManualMode,
  numpad: ManualMode,
  check: ManualMode,
};

export const getRecordingModeComponent = (
  mode: RecordingMode,
): React.ComponentType<RecordingModeProps> => modes[mode];
