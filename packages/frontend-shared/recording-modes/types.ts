import type { RecordingMode } from "@packages/domain/activity/recordingMode";

import type { ActivityBase, ReactHooks } from "../hooks/types";

export type { ActivityBase, ReactHooks };

/** 記録保存時のパラメータ */
export type SaveLogParams = {
  quantity: number | null;
  memo: string;
  activityKindId: string | null;
};

/** 全モードコンポーネントが受け取る共通 Props */
export type RecordingModeProps = {
  activity: ActivityBase;
  kinds: { id: string; name: string; color: string | null }[];
  date: string;
  onSave: (params: SaveLogParams) => Promise<void>;
  isSubmitting: boolean;
  /** 当日の記録ログ（バイナリモード集計・チェックモード判定用） */
  todayLogs?: { activityKindId: string | null; quantity: number | null }[];
};

/**
 * Timer最小型。共通hookで使うメソッドに加え、
 * 各アプリのコンポーネントが追加プロパティに直接アクセスできるよう
 * Record<string, unknown> で拡張を許可する。
 */
export type TimerReturn = {
  isRunning: boolean;
  elapsedTime: number;
  start: () => void;
  stop: () => void;
  reset: () => void;
  getElapsedSeconds: () => number;
  getStartDate: () => Date | null;
} & Record<string, unknown>;

// ---------------------------------------------------------------------------
// Recording Mode ViewModel 型定義
// ---------------------------------------------------------------------------

// 遅延 import を避けるため、各 ViewModel は modes/*.ts で定義し
// ここでは re-export して集約する。
// 実体の import は index.ts が担当するので、このファイルでは型のみ扱う。

/** 全 ViewModel が最低限持つフィールド */
export type RecordingModeViewModelBase = {
  isSubmitting: boolean;
};

/**
 * RecordingMode → ViewModel の対応表。
 * 新モード追加時はここにエントリを足す。型を満たさなければコンパイルエラー。
 *
 * 各 ViewModel 型は modes/ 以下の createUseXxx.ts で定義・export される。
 * ここでは import type で参照し、マップに登録する。
 */
export type RecordingModeViewModelMap = {
  timer: import("./modes/createUseTimerMode").TimerModeViewModel;
  counter: import("./modes/createUseCounterMode").CounterModeViewModel;
  manual: import("./modes/createUseManualMode").ManualModeViewModel;
  numpad: import("./modes/createUseNumpadMode").NumpadModeViewModel;
  binary: import("./modes/createUseBinaryMode").BinaryModeViewModel;
  check: import("./modes/createUseCheckMode").CheckModeViewModel;
};

/**
 * ViewModelMap が全 RecordingMode をカバーしていることのチェック用ユーティリティ。
 * RecordingMode に新しい値を追加したのに ViewModelMap にエントリがない場合、
 * この型が never にならず、UseRecordingModeHook の M 制約でエラーが出る。
 */
export type UncoveredRecordingModes = Exclude<
  RecordingMode,
  keyof RecordingModeViewModelMap
>;

/** 全 ViewModel の Union 型 */
export type RecordingModeViewModel =
  RecordingModeViewModelMap[keyof RecordingModeViewModelMap];

/**
 * モード Hook の型。RecordingModeProps を受け取り、対応する ViewModel を返す。
 * M は keyof RecordingModeViewModelMap に制約される。
 * RecordingModeViewModelMap にエントリがないモードで使おうとするとコンパイルエラー。
 *
 * 新モード追加手順:
 *  1. RecordingMode union に値を追加（packages/domain/activity/recordingMode.ts）
 *  2. createUseXxxMode.ts を作成し XxxModeViewModel 型を export
 *  3. RecordingModeViewModelMap にエントリを追加（このファイル）
 *  4. registry.ts の modes Record にコンポーネントを追加
 */
export type UseRecordingModeHook<M extends keyof RecordingModeViewModelMap> = (
  props: RecordingModeProps,
) => RecordingModeViewModelMap[M];
