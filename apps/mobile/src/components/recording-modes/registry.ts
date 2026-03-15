import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";

import { BinaryMode } from "./modes/BinaryMode";
import { CheckMode } from "./modes/CheckMode";
import { CounterMode } from "./modes/CounterMode";
import { ManualMode } from "./modes/ManualMode";
import { NumpadMode } from "./modes/NumpadMode";
import { TimerMode } from "./modes/TimerMode";

const modes: Record<RecordingMode, React.ComponentType<RecordingModeProps>> = {
  manual: ManualMode,
  timer: TimerMode,
  counter: CounterMode,
  binary: BinaryMode,
  numpad: NumpadMode,
  check: CheckMode,
};

export const getRecordingModeComponent = (
  mode: RecordingMode,
): React.ComponentType<RecordingModeProps> => modes[mode];
