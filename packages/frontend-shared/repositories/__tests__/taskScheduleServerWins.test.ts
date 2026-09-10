import { createSyncTaskSchedules } from "@packages/sync-engine";
import { describe, expect, it } from "vitest";

import { input, setup } from "./taskScheduleTestHelpers";

describe("TaskSchedule authoritative push reconciliation", () => {
  it("applies server wins to the sent pending version even with an older server timestamp", async () => {
    const { repo, store } = setup();
    const row = await repo.createTaskSchedule(input);
    const winner = {
      ...row,
      title: "Server winner",
      updatedAt: "2000-01-01T00:00:00.000Z",
    };
    await repo.upsertTaskSchedulesFromServer(
      [winner],
      [{ id: row.id, updatedAt: row.updatedAt }],
    );
    expect(store.get(row.id)).toEqual({ ...winner, _syncStatus: "synced" });
    expect(await repo.getPendingSyncTaskSchedules()).toEqual([]);
  });

  it("preserves local edits made after the sent snapshot", async () => {
    const { repo, store } = setup();
    const row = await repo.createTaskSchedule(input);
    store.set(row.id, {
      ...row,
      title: "New local edit",
      updatedAt: "2099-01-01T00:00:00.000Z",
    });
    await repo.upsertTaskSchedulesFromServer(
      [{ ...row, title: "Server winner" }],
      [row],
    );
    expect(store.get(row.id)).toMatchObject({
      title: "New local edit",
      _syncStatus: "pending",
    });
  });

  it("retains pull protection and inserts missing rows with snapshots", async () => {
    const { repo, store } = setup();
    const row = await repo.createTaskSchedule(input);
    await repo.upsertTaskSchedulesFromServer([{ ...row, title: "Pull" }]);
    expect(store.get(row.id)?.title).toBe("walk");
    const remote = { ...row, id: "missing", title: "Remote" };
    await repo.upsertTaskSchedulesFromServer([remote], [remote]);
    expect(store.get(remote.id)).toEqual({ ...remote, _syncStatus: "synced" });
  });

  it("connects the real push function to the shared repository and clears the pending winner", async () => {
    const { repo, store } = setup();
    const row = await repo.createTaskSchedule(input);
    const winner = { ...row, title: "Server winner" };
    await createSyncTaskSchedules({
      ...repo,
      postChunk: async () => ({
        syncedIds: [],
        skippedIds: [],
        serverWins: [winner],
      }),
    })();
    expect(store.get(row.id)).toEqual({ ...winner, _syncStatus: "synced" });
  });

  it("protects an edit performed while the real push waits for its response", async () => {
    const { repo, store } = setup();
    const row = await repo.createTaskSchedule(input);
    await createSyncTaskSchedules({
      ...repo,
      postChunk: async () => {
        store.set(row.id, {
          ...row,
          title: "Edited during POST",
          updatedAt: "2099-01-01T00:00:00.000Z",
        });
        return {
          syncedIds: [],
          skippedIds: [],
          serverWins: [{ ...row, title: "Server winner" }],
        };
      },
    })();
    expect(store.get(row.id)).toMatchObject({
      title: "Edited during POST",
      _syncStatus: "pending",
    });
  });
});
