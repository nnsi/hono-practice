import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockApiClientObj } = vi.hoisted(() => ({
  mockApiClientObj: {} as any,
}));

vi.mock("../db/taskRepository");
vi.mock("../utils/apiMappers");
vi.mock("../utils/apiClient", () => ({
  apiClient: mockApiClientObj,
}));

import { taskRepository } from "../db/taskRepository";
import { mapApiTask } from "../utils/apiMappers";
import { syncTasks } from "./syncTasks";

const mockTaskRepo = vi.mocked(taskRepository);

describe("syncTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mapApiTask).mockImplementation((t: any) => t);
  });

  it("skips when no pending tasks", async () => {
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue([]);

    await syncTasks();

    expect(mockTaskRepo.markTasksSynced).not.toHaveBeenCalled();
  });

  it("strips _syncStatus before sending", async () => {
    const pending = [
      {
        id: "t1",
        title: "Task 1",
        userId: "u1",
        startDate: null,
        dueDate: null,
        doneDate: null,
        memo: "",
        archivedAt: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending" as const,
      },
    ];
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue(pending as any);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: ["t1"],
          skippedIds: [],
          serverWins: [],
        }),
    });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await syncTasks();

    const sentJson = mockPost.mock.calls[0][0].json;
    const sentTask = sentJson.tasks[0];
    expect(sentTask).not.toHaveProperty("_syncStatus");
    expect(sentTask.id).toBe("t1");
    expect(sentTask.title).toBe("Task 1");
  });

  it("marks synced, failed, and upserts serverWins", async () => {
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue([
      { id: "t1", _syncStatus: "pending" },
    ] as any);

    const serverWin = { id: "t2", title: "Server Task" };
    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: ["t1"],
          skippedIds: ["t3"],
          serverWins: [serverWin],
        }),
    });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await syncTasks();

    expect(mockTaskRepo.markTasksSynced).toHaveBeenCalledWith(["t1"]);
    expect(mockTaskRepo.markTasksFailed).toHaveBeenCalledWith(["t3"]);
    expect(mockTaskRepo.upsertTasksFromServer).toHaveBeenCalledWith([
      serverWin,
    ]);
  });

  it("does not process when API returns not ok", async () => {
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue([
      { id: "t1", _syncStatus: "pending" },
    ] as any);

    const mockPost = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await syncTasks();

    expect(mockTaskRepo.markTasksSynced).not.toHaveBeenCalled();
  });
});
