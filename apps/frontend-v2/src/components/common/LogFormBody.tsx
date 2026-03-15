import { useState } from "react";

import { resolveRecordingMode } from "@packages/frontend-shared/recording-modes/resolveRecordingMode";
import type { SaveLogParams } from "@packages/frontend-shared/recording-modes/types";
import { useLiveQuery } from "dexie-react-hooks";

import { activityLogRepository } from "../../db/activityLogRepository";
import type { DexieActivity } from "../../db/schema";
import { db } from "../../db/schema";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { syncEngine } from "../../sync/syncEngine";
import { getRecordingModeComponent } from "../recording-modes/registry";
import { computeDebtFeedbackForActivity } from "./computeDebtFeedback";
import { emitDebtFeedback } from "./debtFeedbackEvents";

export function LogFormBody({
  activity,
  date,
  onDone,
}: {
  activity: DexieActivity;
  date: string;
  onDone: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { kinds } = useActivityKinds(activity.id);

  const todayLogs = useLiveQuery(
    () =>
      db.activityLogs
        .where("[date+activityId]")
        .equals([date, activity.id])
        .filter((l) => l.deletedAt === null)
        .toArray(),
    [date, activity.id],
  );

  const mode = resolveRecordingMode(activity);
  const ModeComponent = getRecordingModeComponent(mode);

  const handleSave = async (params: SaveLogParams) => {
    setIsSubmitting(true);

    // Compute debt feedback BEFORE creating the log
    const feedbackResults = await computeDebtFeedbackForActivity(
      activity.id,
      params.quantity ?? 0,
      date,
    );

    // バイナリモードの場合、同一キー（date+activityId+activityKindId）の既存ログがあればquantityを加算
    if (activity.recordingMode === "binary") {
      const existingLog = await db.activityLogs
        .where("[date+activityId]")
        .equals([date, activity.id])
        .filter(
          (l) =>
            l.activityKindId === params.activityKindId && l.deletedAt === null,
        )
        .first();

      if (existingLog) {
        await db.activityLogs.update(existingLog.id, {
          quantity: (existingLog.quantity ?? 0) + (params.quantity ?? 1),
          updatedAt: new Date().toISOString(),
          _syncStatus: "pending" as const,
        });
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

    emitDebtFeedback(feedbackResults);

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
      todayLogs={todayLogs?.map((l) => ({
        activityKindId: l.activityKindId,
        quantity: l.quantity,
      }))}
    />
  );
}
