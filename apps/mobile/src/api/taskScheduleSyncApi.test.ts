import type { SyncTaskSchedulesRequest } from "@packages/types/sync/request/taskSchedule";
import { beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue({ ok: true }),
  post: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock("./apiClient", () => ({
  apiClient: {
    users: {
      v2: {
        "task-schedules": {
          $get: transport.get,
          sync: { $post: transport.post },
        },
      },
    },
  },
}));

import { getTaskSchedules, postTaskSchedules } from "./index";

describe("task schedule transport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards full and delta queries to the typed v2 endpoint", async () => {
    await getTaskSchedules({});
    await getTaskSchedules({ since: "2026-09-10T00:00:00.000Z" });
    expect(transport.get.mock.calls).toEqual([
      [{ query: {} }],
      [{ query: { since: "2026-09-10T00:00:00.000Z" } }],
    ]);
  });

  it("forwards the sync body and preserves HTTP failures for sync policy", async () => {
    const body: SyncTaskSchedulesRequest = { taskSchedules: [] };
    const failure = { ok: false, status: 503 };
    transport.post.mockResolvedValueOnce(failure);
    expect(await postTaskSchedules(body)).toBe(failure);
    expect(transport.post).toHaveBeenCalledWith({ json: body });
  });
});
