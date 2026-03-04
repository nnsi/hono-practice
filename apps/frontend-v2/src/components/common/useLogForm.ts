import { useState } from "react";

import { isDailyGoalJustAchieved } from "@packages/domain/goal/goalAchievement";
import { isGoalActive } from "@packages/domain/goal/goalPredicates";
import { convertSecondsToUnit } from "@packages/domain/time/timeUtils";
import { createUseLogForm } from "@packages/frontend-shared/hooks/useLogForm";

import { activityLogRepository } from "../../db/activityLogRepository";
import { type DexieActivity, db } from "../../db/schema";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { useTimer } from "../../hooks/useTimer";
import { syncEngine } from "../../sync/syncEngine";
import { dispatchGoalAchieved } from "./GoalAchievementToast";

export type UseTimerReturn = ReturnType<typeof useTimer>;

const useLogFormBase = createUseLogForm({
  react: { useState },
  useActivityKinds,
  useTimer,
  activityLogRepository,
  syncEngine,
});

async function getTodayTotalForActivity(
  activityId: string,
  date: string,
): Promise<number> {
  const logs = await db.activityLogs
    .where("[date+activityId]")
    .equals([date, activityId])
    .filter((log) => !log.deletedAt)
    .toArray();
  return logs.reduce((sum, log) => sum + (log.quantity ?? 0), 0);
}

async function checkGoalAchievement(
  activity: DexieActivity,
  date: string,
  previousTotal: number,
  newQuantity: number,
) {
  const goals = await db.goals
    .where("activityId")
    .equals(activity.id)
    .filter(
      (g) =>
        isGoalActive(g) &&
        g.startDate <= date &&
        (!g.endDate || g.endDate >= date),
    )
    .toArray();

  for (const goal of goals) {
    if (
      isDailyGoalJustAchieved(
        goal.dailyTargetQuantity,
        previousTotal,
        newQuantity,
      )
    ) {
      dispatchGoalAchieved({
        activityName: activity.name,
        activityEmoji: activity.emoji,
        dailyTarget: goal.dailyTargetQuantity,
        quantityUnit: activity.quantityUnit ?? "",
      });
      break; // 1つ通知すれば十分
    }
  }
}

export function useLogForm(
  activity: DexieActivity,
  date: string,
  onDone: () => void,
) {
  const base = useLogFormBase(activity, date, onDone);

  return {
    ...base,
    handleManualSubmit: async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      return base.handleManualSubmit();
    },
    handleTimerSave: async () => {
      const seconds = base.timer.getElapsedSeconds();
      const newQuantity = convertSecondsToUnit(seconds, base.timeUnitType);
      const previousTotal = await getTodayTotalForActivity(activity.id, date);

      await base.handleTimerSave();

      checkGoalAchievement(activity, date, previousTotal, newQuantity);
    },
  };
}
