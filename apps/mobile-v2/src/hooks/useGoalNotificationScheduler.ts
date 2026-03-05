import { useCallback } from "react";

import { calcSecondsUntilGoalNotification } from "@packages/domain/goal/goalNotification";
import type { TimeUnitType } from "@packages/domain/time/timeUtils";
import dayjs from "dayjs";

import { getDatabase } from "../db/database";
import {
  cancelGoalNotification,
  scheduleGoalNotification,
} from "../utils/notifications";

function unitToSeconds(unitType: TimeUnitType): number {
  switch (unitType) {
    case "hour":
      return 3600;
    case "minute":
      return 60;
    case "second":
      return 1;
    default:
      return 1;
  }
}

type SqlGoalRow = {
  daily_target_quantity: number;
  is_active: number;
  deleted_at: string | null;
  start_date: string;
  end_date: string | null;
};

type SqlSumRow = { total: number | null };

/**
 * タイマー開始時に目標達成30分前のローカル通知をスケジュールし、
 * タイマー停止時にキャンセルするためのフック。
 */
export function useGoalNotificationScheduler() {
  const scheduleOnTimerStart = useCallback(
    async (
      activityId: string,
      activityName: string,
      timeUnitType: TimeUnitType,
    ) => {
      const db = await getDatabase();
      const today = dayjs().format("YYYY-MM-DD");

      // アクティブな目標を取得
      const goals = await db.getAllAsync<SqlGoalRow>(
        `SELECT daily_target_quantity, is_active, deleted_at, start_date, end_date
         FROM goals
         WHERE activity_id = ? AND deleted_at IS NULL AND is_active = 1
           AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)`,
        [activityId, today, today],
      );

      if (goals.length === 0) return;

      // 今日の合計を取得
      const sumRow = await db.getFirstAsync<SqlSumRow>(
        `SELECT SUM(quantity) as total
         FROM activity_logs
         WHERE activity_id = ? AND date = ? AND deleted_at IS NULL`,
        [activityId, today],
      );
      const previousTotal = sumRow?.total ?? 0;

      const secsPerUnit = unitToSeconds(timeUnitType);

      // 最初に見つかった目標で通知スケジュール
      for (const goal of goals) {
        const remaining = calcSecondsUntilGoalNotification(
          goal.daily_target_quantity,
          previousTotal,
          secsPerUnit,
        );
        if (remaining > 0) {
          await scheduleGoalNotification(activityName, remaining);
          break;
        }
      }
    },
    [],
  );

  const cancelOnTimerStop = useCallback(async () => {
    await cancelGoalNotification();
  }, []);

  return { scheduleOnTimerStart, cancelOnTimerStop };
}
