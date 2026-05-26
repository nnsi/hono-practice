import type { activities, activityKinds } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type {
  UpsertActivityKindRequest,
  UpsertActivityRequest,
} from "@packages/types";

import type { Tracer } from "../../lib/tracer";
import type { ActivitySyncRepository } from "./activitySyncRepository";
import {
  type SyncActivitiesResult,
  syncActivities,
} from "./activitySyncWriteUsecase";

type ActivityRow = typeof activities.$inferSelect;
type ActivityKindRow = typeof activityKinds.$inferSelect;

export type { SyncActivitiesResult } from "./activitySyncWriteUsecase";

export type ActivitySyncUsecase = {
  getActivities: (
    userId: UserId,
  ) => Promise<{ activities: ActivityRow[]; activityKinds: ActivityKindRow[] }>;
  syncActivities: (
    userId: UserId,
    activityList: UpsertActivityRequest[],
    kindList: UpsertActivityKindRequest[],
  ) => Promise<SyncActivitiesResult>;
};

export function newActivitySyncUsecase(
  repo: ActivitySyncRepository,
  tracer: Tracer,
): ActivitySyncUsecase {
  return {
    getActivities: getActivities(repo, tracer),
    syncActivities: syncActivities(repo, tracer),
  };
}

function getActivities(repo: ActivitySyncRepository, tracer: Tracer) {
  return async (userId: UserId) => {
    // activities と kinds は INNER JOIN で userId フィルタできるため並列実行可能。
    // 旧実装は activities → kinds の直列で Hyperdrive 往復が 1回分余計だった。
    const [activityRows, kindRows] = await Promise.all([
      tracer.span("db.getActivitiesByUserId", () =>
        repo.getActivitiesByUserId(userId),
      ),
      tracer.span("db.getActivityKindsByUserId", () =>
        repo.getActivityKindsByUserId(userId),
      ),
    ]);
    // 並列実行の statement snapshot 差で「親 activity が削除された直後の
    // 孤児 kind」を返す可能性があるため、activity id set でフィルタする。
    const activityIdSet = new Set(activityRows.map((a) => a.id));
    const filteredKinds = kindRows.filter((k) =>
      activityIdSet.has(k.activityId),
    );
    return { activities: activityRows, activityKinds: filteredKinds };
  };
}
