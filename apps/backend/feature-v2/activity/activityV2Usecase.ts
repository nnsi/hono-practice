import type { UserId } from "@packages/domain/user/userSchema";
import type {
  UpsertActivityKindRequest,
  UpsertActivityRequest,
} from "@packages/types-v2";
import { activities, activityKinds } from "@infra/drizzle/schema";
import type { Tracer } from "../../lib/tracer";

import type { ActivityV2Repository } from "./activityV2Repository";

type ActivityRow = typeof activities.$inferSelect;
type ActivityKindRow = typeof activityKinds.$inferSelect;

type SyncResult<T> = {
  syncedIds: string[];
  serverWins: T[];
  skippedIds: string[];
};

type SyncActivitiesResult = {
  activities: SyncResult<ActivityRow>;
  activityKinds: SyncResult<ActivityKindRow>;
};

export type ActivityV2Usecase = {
  getActivities: (
    userId: UserId,
  ) => Promise<{ activities: ActivityRow[]; activityKinds: ActivityKindRow[] }>;
  syncActivities: (
    userId: UserId,
    activityList: UpsertActivityRequest[],
    kindList: UpsertActivityKindRequest[],
  ) => Promise<SyncActivitiesResult>;
};

export function newActivityV2Usecase(
  repo: ActivityV2Repository,
  tracer: Tracer,
): ActivityV2Usecase {
  return {
    getActivities: getActivities(repo, tracer),
    syncActivities: syncActivities(repo, tracer),
  };
}

function getActivities(repo: ActivityV2Repository, tracer: Tracer) {
  return async (userId: UserId) => {
    const activityRows = await tracer.span("db.getActivitiesByUserId", () =>
      repo.getActivitiesByUserId(userId),
    );
    const activityIds = activityRows.map((a) => a.id);
    const kindRows = await tracer.span(
      "db.getActivityKindsByActivityIds",
      () => repo.getActivityKindsByActivityIds(activityIds),
    );
    return { activities: activityRows, activityKinds: kindRows };
  };
}

function syncActivities(repo: ActivityV2Repository, tracer: Tracer) {
  return async (
    userId: UserId,
    activityList: UpsertActivityRequest[],
    kindList: UpsertActivityKindRequest[],
  ): Promise<SyncActivitiesResult> => {
    const maxAllowed = new Date(Date.now() + 5 * 60 * 1000);

    // --- Activities sync ---
    const actResult = await syncActivityEntities(
      repo,
      userId,
      activityList,
      maxAllowed,
      tracer,
    );

    // --- ActivityKinds sync ---
    const kindResult = await syncActivityKindEntities(
      repo,
      userId,
      kindList,
      maxAllowed,
      tracer,
    );

    return {
      activities: actResult,
      activityKinds: kindResult,
    };
  };
}

async function syncActivityEntities(
  repo: ActivityV2Repository,
  userId: UserId,
  activityList: UpsertActivityRequest[],
  maxAllowed: Date,
  tracer: Tracer,
): Promise<SyncResult<ActivityRow>> {
  const skippedIds: string[] = [];

  const validActivities = activityList.filter((activity) => {
    if (new Date(activity.updatedAt) > maxAllowed) {
      skippedIds.push(activity.id);
      return false;
    }
    return true;
  });

  if (validActivities.length === 0) {
    return { syncedIds: [], serverWins: [], skippedIds };
  }

  const upserted = await tracer.span("db.upsertActivities", () =>
    repo.upsertActivities(userId, validActivities),
  );

  const syncedIdSet = new Set(upserted.map((r) => r.id));
  const syncedIds = [...syncedIdSet];

  const missedIds = validActivities
    .map((a) => a.id)
    .filter((id) => !syncedIdSet.has(id));

  let serverWins: ActivityRow[] = [];
  if (missedIds.length > 0) {
    serverWins = await tracer.span("db.getActivitiesByIds", () =>
      repo.getActivitiesByIds(userId, missedIds),
    );
    const serverWinIdSet = new Set(serverWins.map((s) => s.id));
    for (const id of missedIds) {
      if (!serverWinIdSet.has(id)) {
        skippedIds.push(id);
      }
    }
  }

  return { syncedIds, serverWins, skippedIds };
}

async function syncActivityKindEntities(
  repo: ActivityV2Repository,
  userId: UserId,
  kindList: UpsertActivityKindRequest[],
  maxAllowed: Date,
  tracer: Tracer,
): Promise<SyncResult<ActivityKindRow>> {
  const requestedActivityIds = [...new Set(kindList.map((k) => k.activityId))];
  const ownedIds = await tracer.span("db.getOwnedActivityIds", () =>
    repo.getOwnedActivityIds(userId, requestedActivityIds),
  );
  const ownedActivityIdSet = new Set(ownedIds);

  const skippedIds: string[] = [];

  const validKinds = kindList.filter((kind) => {
    if (
      !ownedActivityIdSet.has(kind.activityId) ||
      new Date(kind.updatedAt) > maxAllowed
    ) {
      skippedIds.push(kind.id);
      return false;
    }
    return true;
  });

  if (validKinds.length === 0) {
    return { syncedIds: [], serverWins: [], skippedIds };
  }

  const upserted = await tracer.span("db.upsertActivityKinds", () =>
    repo.upsertActivityKinds(validKinds),
  );

  const syncedIdSet = new Set(upserted.map((r) => r.id));
  const syncedIds = [...syncedIdSet];

  const missedIds = validKinds
    .map((k) => k.id)
    .filter((id) => !syncedIdSet.has(id));

  let serverWins: ActivityKindRow[] = [];
  if (missedIds.length > 0) {
    serverWins = await tracer.span("db.getActivityKindsByIds", () =>
      repo.getActivityKindsByIds(missedIds),
    );
    const serverWinIdSet = new Set(serverWins.map((s) => s.id));
    for (const id of missedIds) {
      if (!serverWinIdSet.has(id)) {
        skippedIds.push(id);
      }
    }
  }

  return { syncedIds, serverWins, skippedIds };
}
