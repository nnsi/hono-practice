import type { SyncRevision } from "@packages/domain/sync/syncableRecord";
import { describe, expect, it, vi } from "vitest";

import { createSyncActivities } from "./createSyncActivities";

type LocalRecord = {
  id: string;
  updatedAt: string;
  _syncStatus: "pending" | "synced" | "failed" | "rejected";
};

describe("createSyncActivities revision guards", () => {
  it("keeps newer pending edits when an older in-flight snapshot finishes", async () => {
    const records = new Map<string, LocalRecord>(
      ["synced", "failed", "rejected"].map((id) => [
        id,
        {
          id,
          updatedAt: "2026-01-01T00:00:00.000Z",
          _syncStatus: "pending",
        },
      ]),
    );
    const applyStatus = vi.fn(
      async (revisions: SyncRevision[], status: LocalRecord["_syncStatus"]) => {
        for (const revision of revisions) {
          const current = records.get(revision.id);
          if (current?.updatedAt === revision.updatedAt) {
            records.set(revision.id, { ...current, _syncStatus: status });
          }
        }
      },
    );
    const sync = createSyncActivities({
      getPendingSyncActivities: async () => [...records.values()],
      getPendingSyncActivityKinds: async () => [],
      postChunk: async () => {
        for (const [id, current] of records) {
          records.set(id, {
            ...current,
            updatedAt: "2026-01-01T00:00:01.000Z",
          });
        }
        return {
          activities: {
            syncedIds: ["synced"],
            skippedIds: ["failed"],
            serverWins: [],
            failures: [
              {
                id: "rejected",
                code: "VALIDATION_ERROR",
                message: "bad record",
                retryable: false,
              },
            ],
          },
          activityKinds: {
            syncedIds: [],
            skippedIds: [],
            serverWins: [],
            failures: [],
          },
        };
      },
      markActivitiesSynced: (revisions) => applyStatus(revisions, "synced"),
      markActivitiesFailed: (revisions) => applyStatus(revisions, "failed"),
      markActivitiesRejected: (revisions) => applyStatus(revisions, "rejected"),
      upsertActivities: async () => {},
      markActivityKindsSynced: async () => {},
      markActivityKindsFailed: async () => {},
      markActivityKindsRejected: async () => {},
      upsertActivityKinds: async () => {},
    });

    await sync();

    expect([...records.values()].map((record) => record._syncStatus)).toEqual([
      "pending",
      "pending",
      "pending",
    ]);
    expect(applyStatus.mock.calls).toEqual([
      [[{ id: "synced", updatedAt: "2026-01-01T00:00:00.000Z" }], "synced"],
      [[{ id: "failed", updatedAt: "2026-01-01T00:00:00.000Z" }], "failed"],
      [[{ id: "rejected", updatedAt: "2026-01-01T00:00:00.000Z" }], "rejected"],
    ]);
  });
});
