import { useState } from "react";

import { emitDebtFeedback } from "@packages/frontend-shared";
import { resolveRecordingMode } from "@packages/frontend-shared/recording-modes/resolveRecordingMode";
import type { SaveLogParams } from "@packages/frontend-shared/recording-modes/types";
import { getServerNowISOString } from "@packages/sync-engine";

import { getDatabase } from "../../db/database";
import { useLiveQuery } from "../../db/useLiveQuery";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import {
  activityLogRepository,
  mapActivityLogRow,
} from "../../repositories/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import { getRecordingModeComponent } from "../recording-modes/registry";
import { computeDebtFeedbackForAllGoals } from "./computeDebtFeedback";

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
        const now = getServerNowISOString();
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
