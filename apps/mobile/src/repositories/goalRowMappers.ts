import type { SyncStatus } from "@packages/domain";
import { parseDayTargets } from "@packages/domain/goal/dayTargets";
import type { GoalRecord } from "@packages/domain/goal/goalRecord";

import { str, strOrNull, toSyncStatus } from "./sqlRowHelpers";

export type SqlRow = Record<string, unknown>;

export type GoalWithSync = GoalRecord & { _syncStatus: SyncStatus };

function num(v: unknown, defaultValue: number): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isNaN(n) ? defaultValue : n;
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// Goals in the local DB do NOT store currentBalance/totalTarget/totalActual
// (they are computed from logs). We include them as 0 in the mapped type
// for compatibility with GoalRecord.
export function mapGoalRow(row: SqlRow): GoalWithSync {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    activityId: str(row.activity_id),
    dailyTargetQuantity: num(row.daily_target_quantity, 0),
    startDate: str(row.start_date),
    endDate: strOrNull(row.end_date),
    isActive: row.is_active === 1,
    description: str(row.description),
    debtCap: numOrNull(row.debt_cap),
    dayTargets: parseDayTargets(row.day_targets),
    currentBalance: 0,
    totalTarget: 0,
    totalActual: 0,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

// --- Column map (camelCase → snake_case) ---

export const goalColumnMap: Record<string, string> = {
  dailyTargetQuantity: "daily_target_quantity",
  startDate: "start_date",
  endDate: "end_date",
  isActive: "is_active",
  description: "description",
  debtCap: "debt_cap",
  dayTargets: "day_targets",
  updatedAt: "updated_at",
  _syncStatus: "sync_status",
  deletedAt: "deleted_at",
};
