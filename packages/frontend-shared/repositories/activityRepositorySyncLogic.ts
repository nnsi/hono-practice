import type {
  ActivityKindRecord,
  ActivityRecord,
} from "@packages/domain/activity/activityRecord";
import { v7 as uuidv7 } from "uuid";

import type { ActivityDbAdapter } from "./activityDbAdapter";
import { filterSafeUpserts } from "./syncHelpers";

export async function applySyncMarkHelpers(
  adapter: ActivityDbAdapter,
  op:
    | { type: "markActivitiesSynced"; ids: string[] }
    | { type: "markActivityKindsSynced"; ids: string[] }
    | { type: "markActivitiesFailed"; ids: string[] }
    | { type: "markActivityKindsFailed"; ids: string[] }
    | { type: "markActivitiesRejected"; ids: string[] }
    | { type: "markActivityKindsRejected"; ids: string[] },
) {
  if (op.ids.length === 0) return;
  switch (op.type) {
    case "markActivitiesSynced":
      return adapter.updateActivitiesSyncStatus(op.ids, "synced");
    case "markActivityKindsSynced":
      return adapter.updateKindsSyncStatus(op.ids, "synced");
    case "markActivitiesFailed":
      return adapter.updateActivitiesSyncStatus(op.ids, "failed");
    case "markActivityKindsFailed":
      return adapter.updateKindsSyncStatus(op.ids, "failed");
    case "markActivitiesRejected":
      return adapter.updateActivitiesSyncStatus(op.ids, "rejected");
    case "markActivityKindsRejected":
      return adapter.updateKindsSyncStatus(op.ids, "rejected");
  }
}

export async function upsertActivities(
  adapter: ActivityDbAdapter,
  activities: ActivityRecord[],
) {
  if (activities.length === 0) return;
  const localRecords = await adapter.getActivitiesByIds(
    activities.map((a) => a.id),
  );
  const safe = filterSafeUpserts(activities, localRecords);
  if (safe.length === 0) return;
  await adapter.bulkUpsertActivities(
    safe.map((a) => ({ ...a, _syncStatus: "synced" as const })),
  );
}

export async function upsertActivityKinds(
  adapter: ActivityDbAdapter,
  kinds: ActivityKindRecord[],
) {
  if (kinds.length === 0) return;
  const localRecords = await adapter.getKindsByIds(kinds.map((k) => k.id));
  const safe = filterSafeUpserts(kinds, localRecords);
  if (safe.length === 0) return;
  await adapter.bulkUpsertKinds(
    safe.map((k) => ({ ...k, _syncStatus: "synced" as const })),
  );
}

export async function applyKindUpdates(
  adapter: ActivityDbAdapter,
  activityId: string,
  updatedKinds: { id?: string; name: string; color: string }[],
  now: string,
) {
  const existing = await adapter.getKindsByActivityId(activityId);
  const updatedIds = new Set(
    updatedKinds.filter((k) => k.id).map((k) => k.id!),
  );

  for (const existingKind of existing) {
    if (!updatedIds.has(existingKind.id)) {
      await adapter.updateKind(existingKind.id, {
        deletedAt: now,
        updatedAt: now,
        _syncStatus: "pending",
      });
    }
  }

  for (let i = 0; i < updatedKinds.length; i++) {
    const kind = updatedKinds[i];
    if (kind.id) {
      await adapter.updateKind(kind.id, {
        name: kind.name,
        color: kind.color || null,
        orderIndex: String(i).padStart(6, "0"),
        updatedAt: now,
        _syncStatus: "pending",
      });
    } else {
      await adapter.insertKind({
        id: uuidv7(),
        activityId,
        name: kind.name,
        color: kind.color || null,
        orderIndex: String(i).padStart(6, "0"),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        _syncStatus: "pending",
      });
    }
  }
}
