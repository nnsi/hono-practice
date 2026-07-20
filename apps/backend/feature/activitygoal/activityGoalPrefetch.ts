import type { FreezePeriod } from "@packages/domain/goal/goalBalance";
import type { ActivityGoal } from "@packages/domain/goal/goalSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityLogRepository, ActivityLogSummary } from "../activityLog";
import type { GoalFreezePeriodRepository } from "./goalFreezePeriodRepository";

export function toFreezePeriods(
  rows: { startDate: string; endDate: string | null; deletedAt: Date | null }[],
): FreezePeriod[] {
  return rows
    .filter((r) => !r.deletedAt)
    .map((r) => ({ startDate: r.startDate, endDate: r.endDate }));
}

/**
 * 指定ユーザーの全ゴールに必要なactivity-logsを一括取得する。
 * 各ゴールのstartDate〜todayの最大範囲をカバーする1回のクエリで取得。
 */
export async function prefetchActivityLogs(
  activityLogRepo: ActivityLogRepository,
  userId: UserId,
  goals: ActivityGoal[],
  clientDate: string,
): Promise<ActivityLogSummary[]> {
  if (goals.length === 0) return [];

  const today = clientDate;

  let minStart = goals[0].startDate;
  let maxEnd = today;
  for (const goal of goals) {
    if (goal.startDate < minStart) minStart = goal.startDate;
    const endDate = goal.endDate && goal.endDate < today ? goal.endDate : today;
    if (endDate > maxEnd) maxEnd = endDate;
  }

  return activityLogRepo.getActivityLogSummariesByUserIdAndDate(
    userId,
    minStart,
    maxEnd,
  );
}

/**
 * 複数ゴール分のフリーズ期間を1クエリでまとめて取得し、goalId ごとに引ける Map にする。
 * REST /goals の一覧取得（N+1 回避）で使用する。
 */
export function prefetchFreezePeriods(
  freezePeriodRepo: GoalFreezePeriodRepository,
) {
  return async (
    userId: UserId,
    goals: ActivityGoal[],
  ): Promise<Map<string, FreezePeriod[]>> => {
    const map = new Map<string, FreezePeriod[]>();
    if (goals.length === 0) return map;

    const goalIds = goals.map((g) => g.id);
    const rows = await freezePeriodRepo.getFreezePeriodsByGoalIds(
      userId,
      goalIds,
    );

    for (const row of rows) {
      if (row.deletedAt) continue;
      const existing = map.get(row.goalId) ?? [];
      existing.push({ startDate: row.startDate, endDate: row.endDate });
      map.set(row.goalId, existing);
    }
    return map;
  };
}
