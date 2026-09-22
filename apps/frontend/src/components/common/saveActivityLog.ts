import { emitDebtFeedback } from "@packages/frontend-shared";
import type { SaveLogParams } from "@packages/frontend-shared/recording-modes/types";
import { getServerNowISOString } from "@packages/sync-engine";

import { activityLogRepository } from "../../db/activityLogRepository";
import type { DexieActivity } from "../../db/schema";
import { db } from "../../db/schema";
import { syncEngine } from "../../sync/syncEngine";
import { computeDebtFeedbackForAllGoals } from "./computeDebtFeedback";

export type SaveActivityLogResult = {
  /**
   * 新規作成したログの id。binary モードで同一 Kind の既存ログに加算した場合は null。
   * 取り消し（soft delete）に使う。
   */
  createdLogId: string | null;
};

/**
 * 記録モード共通の保存処理。
 * Debt フィードバックの計算、binary モードの同一 Kind 加算、同期トリガーまでを担う。
 * モーダル（LogFormBody）とカード上の即時記録の両方から呼ぶ。
 */
export async function saveActivityLog(
  activity: DexieActivity,
  date: string,
  params: SaveLogParams,
): Promise<SaveActivityLogResult> {
  // Compute debt feedback BEFORE creating the log
  const feedbackResults = await computeDebtFeedbackForAllGoals(
    activity.id,
    params.quantity ?? 0,
    date,
  );

  let createdLogId: string | null = null;

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
        updatedAt: getServerNowISOString(),
        _syncStatus: "pending" as const,
      });
    } else {
      const created = await activityLogRepository.createActivityLog({
        activityId: activity.id,
        activityKindId: params.activityKindId,
        quantity: params.quantity,
        memo: params.memo,
        date,
        time: null,
        taskId: null,
      });
      createdLogId = created.id;
    }
  } else {
    const created = await activityLogRepository.createActivityLog({
      activityId: activity.id,
      activityKindId: params.activityKindId,
      quantity: params.quantity,
      memo: params.memo,
      date,
      time: null,
      taskId: null,
    });
    createdLogId = created.id;
  }

  emitDebtFeedback(feedbackResults);

  syncEngine.syncActivityLogs();
  return { createdLogId };
}

/** カード上の即時記録を取り消す（soft delete して同期に載せる） */
export async function undoActivityLog(logId: string): Promise<void> {
  await activityLogRepository.softDeleteActivityLog(logId);
  syncEngine.syncActivityLogs();
}
