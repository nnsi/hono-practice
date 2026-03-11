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
