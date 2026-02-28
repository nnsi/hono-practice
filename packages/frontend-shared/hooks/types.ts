/**
 * React hooks DI型（Metro + pnpm 環境で packages/ から react を
 * 直接 import すると CJS 初期化問題が起きるため）。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ReactHooks = {
  useState: {
    <T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
    <T = undefined>(): [T | undefined, (value: T | undefined | ((prev: T | undefined) => T | undefined)) => void];
  };
  useMemo: <T>(factory: () => T, deps: readonly any[]) => T;
  useCallback: <T extends (...args: any[]) => any>(callback: T, deps: readonly any[]) => T;
  useEffect: (effect: () => void | (() => void), deps?: readonly any[]) => void;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Activity最小型（DexieActivity / ActivityRecord の両方が満たす）
 */
export type ActivityBase = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
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
 * Goal型（frontend-v2 / mobile-v2 で完全同一）
 */
export type Goal = {
  id: string;
  userId: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  description: string;
  currentBalance: number;
  totalTarget: number;
  totalActual: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateGoalPayload = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
};

export type UpdateGoalPayload = {
  dailyTargetQuantity?: number;
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
};

/**
 * Daily ページのタスク最小型
 */
export type DailyTask = {
  id: string;
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
