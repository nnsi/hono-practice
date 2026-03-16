import { AppError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import { createActivityId } from "@packages/domain/activity/activitySchema";
import type { ActivityLog } from "@packages/domain/activityLog/activityLogSchema";
import {
  createActivityLogEntity,
  createActivityLogId,
} from "@packages/domain/activityLog/activityLogSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityRepository } from "../activity";
import type { ActivityLogRepository } from "../activityLog";
import type {
  AIActivityLogGateway,
  ActivityContext,
} from "./aiActivityLogGateway";

export type AIActivityLogUsecase = {
  createActivityLogFromSpeech(
    userId: UserId,
    speechText: string,
    today: string,
  ): Promise<{
    activityLog: ActivityLog;
    interpretation: {
      detectedActivityName: string;
      detectedKindName: string | null;
      rawText: string;
    };
  }>;
};

export function newAIActivityLogUsecase(
  gateway: AIActivityLogGateway,
  activityRepo: ActivityRepository,
  activityLogRepo: ActivityLogRepository,
  tracer: Tracer,
): AIActivityLogUsecase {
  return {
    createActivityLogFromSpeech: createActivityLogFromSpeech(
      gateway,
      activityRepo,
      activityLogRepo,
      tracer,
    ),
  };
}

function createActivityLogFromSpeech(
  gateway: AIActivityLogGateway,
  activityRepo: ActivityRepository,
  activityLogRepo: ActivityLogRepository,
  tracer: Tracer,
) {
  return async (userId: UserId, speechText: string, today: string) => {
    // 1. ユーザーのActivity一覧を取得
    const activities = await tracer.span("db.getActivitiesByUserId", () =>
      activityRepo.getActivitiesByUserId(userId),
    );

    if (activities.length === 0) {
      throw new AppError("No activities registered", 400);
    }

    // 2. AIが解釈できるコンテキストに変換
    const activityContexts: ActivityContext[] = activities.map((a) => ({
      id: a.id,
      name: a.name,
      quantityUnit: a.quantityUnit,
      kinds: (a.kinds ?? []).map((k) => ({ id: k.id, name: k.name })),
    }));

    // 3. Gateway経由でAI（またはモック）に解析させる
    const result = await tracer.span("ai.parseActivityLog", () =>
      gateway.parseActivityLog(speechText, activityContexts, today),
    );

    // 4. ドメイン型に変換してActivityLogを作成
    const activityId = createActivityId(result.parsed.activityId);

    const activity = activities.find((a) => a.id === activityId);
    if (!activity) {
      throw new AppError("Parsed activity not found in user's activities", 400);
    }

    const activityKind = result.parsed.activityKindId
      ? ((activity.kinds ?? []).find(
          (k) => k.id === result.parsed.activityKindId,
        ) ?? null)
      : null;

    const activityLog = createActivityLogEntity({
      id: createActivityLogId(),
      userId,
      date: new Date(result.parsed.date),
      quantity: result.parsed.quantity,
      memo: result.parsed.memo,
      activity,
      activityKind,
      type: "new",
    });

    // 5. DBに保存
    const saved = await tracer.span("db.createActivityLog", () =>
      activityLogRepo.createActivityLog(activityLog),
    );

    return {
      activityLog: saved,
      interpretation: result.interpretation,
    };
  };
}
