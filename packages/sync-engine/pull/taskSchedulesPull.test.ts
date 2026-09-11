import { describe, expect, it } from "vitest";

import { createV2InitialSync } from "./createV2InitialSync";
import {
  BOOTSTRAPPED_KEY,
  LAST_SYNCED_KEY,
  createDeps,
  createStorage,
  okResponse,
} from "./v2InitialSyncTestHelpers";

const schedule = {
  id: "s1",
  recurrenceType: "interval",
  intervalDays: 2,
  memo: null,
};
const resources = [
  "logs",
  "goals",
  "freezePeriods",
  "tasks",
  "notes",
  "taskSchedules",
];
describe("taskSchedules pull", () => {
  it("full pulls the new resource on legacy installs then uses delta", async () => {
    const since = "2026-03-01T00:00:00.000Z";
    const deps = createDeps({
      defaultStorage: createStorage({ [LAST_SYNCED_KEY]: since }),
    });
    deps.api.getTaskSchedules.mockResolvedValue(
      okResponse({ taskSchedules: [schedule] }),
    );
    const sync = createV2InitialSync(deps);
    await sync.performInitialSync("u1");
    expect(deps.api.getTaskSchedules).toHaveBeenLastCalledWith({});
    expect(deps.api.getTasks).toHaveBeenLastCalledWith({ since });
    expect(
      deps.repos.taskSchedule.upsertTaskSchedulesFromServer,
    ).toHaveBeenCalledWith([expect.objectContaining(schedule)]);
    const watermark = deps.defaultStorage.getItem(LAST_SYNCED_KEY);
    await sync.performInitialSync("u1");
    expect(deps.api.getTaskSchedules).toHaveBeenLastCalledWith({
      since: watermark,
    });
  });
  it("removes failed resources from bootstrap state and retries a full pull", async () => {
    const since = "2026-03-01T00:00:00.000Z";
    const deps = createDeps({
      defaultStorage: createStorage({
        [LAST_SYNCED_KEY]: since,
        [BOOTSTRAPPED_KEY]: JSON.stringify(resources),
      }),
    });
    deps.api.getTaskSchedules.mockRejectedValueOnce(new Error("offline"));
    const sync = createV2InitialSync(deps);
    await sync.performInitialSync("u1");
    expect(deps.api.getTaskSchedules).toHaveBeenLastCalledWith({ since });
    expect(
      JSON.parse(deps.defaultStorage.getItem(BOOTSTRAPPED_KEY) ?? "[]"),
    ).not.toContain("taskSchedules");
    expect(deps.defaultStorage.getItem(LAST_SYNCED_KEY)).not.toBe(since);
    await sync.performInitialSync("u1");
    expect(deps.api.getTaskSchedules).toHaveBeenLastCalledWith({});
    expect(
      JSON.parse(deps.defaultStorage.getItem(BOOTSTRAPPED_KEY) ?? "[]"),
    ).toContain("taskSchedules");
  });
  it("keeps watermark unchanged for an HTTP error and retries the same delta", async () => {
    const since = "2026-03-01T00:00:00.000Z";
    const deps = createDeps({
      defaultStorage: createStorage({
        [LAST_SYNCED_KEY]: since,
        [BOOTSTRAPPED_KEY]: JSON.stringify(resources),
      }),
    });
    deps.api.getTaskSchedules.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    const sync = createV2InitialSync(deps);
    await sync.performInitialSync("u1");
    expect(deps.defaultStorage.getItem(LAST_SYNCED_KEY)).toBe(since);
    await sync.performInitialSync("u1");
    expect(deps.api.getTaskSchedules).toHaveBeenLastCalledWith({ since });
  });
});
