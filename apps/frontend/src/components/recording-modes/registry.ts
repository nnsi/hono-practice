import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";

import { BinaryMode } from "./modes/BinaryMode";
import { CheckMode } from "./modes/CheckMode";
import { CounterMode } from "./modes/CounterMode";
import { ManualMode } from "./modes/ManualMode";
import { NumpadMode } from "./modes/NumpadMode";
import { TimerMode } from "./modes/TimerMode";

/**
 * RecordingMode → Component のマッピング。
 * Record<RecordingMode, ...> 型により、RecordingMode に新しい値が追加されると
 * ここにもエントリを足さない限りコンパイルエラーになる。
 *
 * 新モード追加手順:
 *  1. RecordingMode union に値を追加 (packages/domain/activity/recordingMode.ts)
 *  2. createUseXxxMode.ts を作成し XxxModeViewModel を export (packages/frontend-shared)
 *  3. RecordingModeViewModelMap にエントリを追加 (packages/frontend-shared/recording-modes/types.ts)
 *  4. XxxMode.tsx コンポーネントを作成 (このディレクトリの modes/)
 *  5. この Record にコンポーネントを追加
 */
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
