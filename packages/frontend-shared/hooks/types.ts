/**
 * React hooks DI型（Metro + pnpm 環境で packages/ から react を
 * 直接 import すると CJS 初期化問題が起きるため）。
 */
export type ReactHooks = {
  useState: {
    <T>(
      initialState: T | (() => T),
    ): [T, (value: T | ((prev: T) => T)) => void];
    <T = undefined>(): [
      T | undefined,
      (value: T | undefined | ((prev: T | undefined) => T | undefined)) => void,
    ];
  };
  // biome-ignore lint/suspicious/noExplicitAny: React.useMemo deps type
  useMemo: <T>(factory: () => T, deps: readonly any[]) => T;
  useCallback: <T extends (...args: never[]) => unknown>(
    callback: T,
    // biome-ignore lint/suspicious/noExplicitAny: React.useCallback deps type
    deps: readonly any[],
  ) => T;
  // biome-ignore lint/suspicious/noExplicitAny: React.useEffect deps type
  useEffect: (effect: () => void | (() => void), deps?: readonly any[]) => void;
};

/**
 * Activity最小型（DexieActivity / ActivityRecord の両方が満たす）
 */
export type ActivityBase = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
  recordingMode: string;
  recordingModeConfig?: string | null;
};

/**
 * ActivityLog最小型
 */
export type ActivityLogBase = {
  id: string;
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  memo: string;
  date: string;
  time: string | null;
};

/**
 * IconBlob最小型（activityId だけあれば Map のキーに使える）
 */
export type IconBlobBase = {
  activityId: string;
};

/**
 * Goal型（frontend / mobile で完全同一）
 */
import type { DayTargets } from "@packages/domain/goal/dayTargets";

export type Goal = {
  id: string;
  userId: string;
  activityId: string;
  dailyTargetQuantity: number;
  dayTargets: DayTargets | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  description: string;
  debtCap: number | null;
  currentBalance: number;
  totalTarget: number;
  totalActual: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateGoalPayload = {
  activityId: string;
  dailyTargetQuantity: number;
  dayTargets?: DayTargets | null;
  startDate: string;
  endDate?: string;
  debtCap?: number | null;
};

export type UpdateGoalPayload = {
  dailyTargetQuantity?: number;
  dayTargets?: DayTargets | null;
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
  debtCap?: number | null;
};

/**
 * Daily ページのタスク最小型
 */
export type DailyTask = {
  id: string;
  activityId: string | null;
  activityKindId: string | null;
  quantity: number | null;
  title: string;
  doneDate: string | null;
  memo: string;
  startDate: string | null;
  dueDate: string | null;
};

/**
 * ActivityKind最小型
 */
export type ActivityKindBase = {
  id: string;
  activityId: string;
  name: string;
  deletedAt: string | null;
};
