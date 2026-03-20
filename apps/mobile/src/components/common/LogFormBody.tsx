import { useState } from "react";

import {
  type DebtFeedbackResult,
  calculateDebtFeedback,
} from "@packages/domain/goal/goalDebtFeedback";
import { resolveRecordingMode } from "@packages/frontend-shared/recording-modes/resolveRecordingMode";
import type { SaveLogParams } from "@packages/frontend-shared/recording-modes/types";
import dayjs from "dayjs";

import { getDatabase } from "../../db/database";
import { useLiveQuery } from "../../db/useLiveQuery";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import {
  activityLogRepository,
  mapActivityLogRow,
} from "../../repositories/activityLogRepository";
import { goalFreezePeriodRepository } from "../../repositories/goalFreezePeriodRepository";
import { goalRepository } from "../../repositories/goalRepository";
import { syncEngine } from "../../sync/syncEngine";
import { getRecordingModeComponent } from "../recording-modes/registry";
import { emitDebtFeedback } from "./debtFeedbackEvents";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
  recordingMode: string;
  recordingModeConfig?: string | null;
};

export function LogFormBody({
  activity,
  date,
  onDone,
}: {
  activity: Activity;
  date: string;
  onDone: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { kinds } = useActivityKinds(activity.id);

  const todayLogsRaw = useLiveQuery(
    "activity_logs",
    () => activityLogRepository.getActivityLogsByDate(date),
    [date],
  );
  const todayLogs = (todayLogsRaw ?? [])
    .filter((l) => l.activityId === activity.id)
    .map((l) => ({ activityKindId: l.activityKindId, quantity: l.quantity }));

  const mode = resolveRecordingMode(activity);
  const ModeComponent = getRecordingModeComponent(mode);

  const handleSave = async (params: SaveLogParams) => {
    setIsSubmitting(true);

    // 1. Calculate debt feedback before creating the log
    const feedbackResults = await computeDebtFeedbackForAllGoals(
      activity.id,
      params.quantity ?? 0,
      date,
    );

    // 2. Create or aggregate the log
    // バイナリモードの場合、同一キー（date+activityId+activityKindId）の既存ログがあればquantityを加算
    if (activity.recordingMode === "binary") {
      const sqlDb = await getDatabase();
      type SqlRow = Record<string, unknown>;
      const kindFilter =
        params.activityKindId != null
          ? "AND activity_kind_id = ?"
          : "AND activity_kind_id IS NULL";
      const queryParams =
        params.activityKindId != null
          ? [date, activity.id, params.activityKindId]
          : [date, activity.id];
      const rows = await sqlDb.getAllAsync<SqlRow>(
        `SELECT * FROM activity_logs WHERE date = ? AND activity_id = ? ${kindFilter} AND deleted_at IS NULL LIMIT 1`,
        queryParams,
      );
      const existingLog = rows.length > 0 ? mapActivityLogRow(rows[0]) : null;

      if (existingLog) {
        const now = new Date().toISOString();
        await sqlDb.runAsync(
          "UPDATE activity_logs SET quantity = ?, updated_at = ?, sync_status = ? WHERE id = ?",
          [
            (existingLog.quantity ?? 0) + (params.quantity ?? 1),
            now,
            "pending",
            existingLog.id,
          ],
        );
      } else {
        await activityLogRepository.createActivityLog({
          activityId: activity.id,
          activityKindId: params.activityKindId,
          quantity: params.quantity,
          memo: params.memo,
          date,
          time: null,
          taskId: null,
        });
      }
    } else {
      await activityLogRepository.createActivityLog({
        activityId: activity.id,
        activityKindId: params.activityKindId,
        quantity: params.quantity,
        memo: params.memo,
        date,
        time: null,
        taskId: null,
      });
    }

    // 3. Emit feedback if available
    emitDebtFeedback(feedbackResults);

    // 4. Sync + done
    syncEngine.syncActivityLogs();
    setIsSubmitting(false);
    onDone();
  };

  return (
    <ModeComponent
      activity={activity}
      kinds={kinds}
      date={date}
      onSave={handleSave}
      isSubmitting={isSubmitting}
      todayLogs={todayLogs}
    />
  );
}

// --- Debt feedback helper ---

async function computeDebtFeedbackForAllGoals(
  activityId: string,
  quantityRecorded: number,
  date: string,
): Promise<DebtFeedbackResult[]> {
  if (quantityRecorded <= 0) return [];

  const today = dayjs().format("YYYY-MM-DD");

  const allGoals = await goalRepository.getAllGoals();
  const activeGoals = allGoals.filter(
    (g) =>
      g.activityId === activityId &&
      g.dailyTargetQuantity > 0 &&
      g.deletedAt == null &&
      g.isActive,
  );

  if (activeGoals.length === 0) return [];

  const results: DebtFeedbackResult[] = [];

  for (const goal of activeGoals) {
    // Skip goals whose date range doesn't cover the recording date
    if (date < goal.startDate) continue;
    if (goal.endDate && date > goal.endDate) continue;

    const endDate = goal.endDate ?? today;
    const logs = await activityLogRepository.getActivityLogsBetween(
      goal.startDate,
      endDate,
    );
    const goalLogs = logs
      .filter((l) => l.activityId === activityId)
      .map((l) => ({ date: l.date, quantity: l.quantity }));

    const freezePeriods =
      await goalFreezePeriodRepository.getFreezePeriodsByGoalId(goal.id);
    const freezePeriodsInput = freezePeriods.map((fp) => ({
      startDate: fp.startDate,
      endDate: fp.endDate,
    }));

    const result = calculateDebtFeedback(
      goal,
      goalLogs,
      quantityRecorded,
      date,
      today,
      freezePeriodsInput,
    );

    result.goalLabel =
      activeGoals.length > 1
        ? goal.description || `目標${goal.dailyTargetQuantity}/日`
        : null;

    results.push(result);
  }

  return results;
}
