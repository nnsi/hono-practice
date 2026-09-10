import type { TaskItem } from "@packages/domain/task/types";
import type { VirtualScheduledTask } from "@packages/domain/taskSchedule";
import { describe, expect, it, vi } from "vitest";

import {
  isVirtualScheduledTask,
  materializeScheduledTask,
} from "./materializeScheduledTask";

const virtualTask: VirtualScheduledTask = {
  id: "virtual-1",
  userId: "user-1",
  activityId: "act-1",
  activityKindId: "kind-1",
  quantity: 5,
  scheduleId: "schedule-1",
  scheduledDate: "2026-09-10",
  title: "Bench press",
  startDate: "2026-09-10",
  dueDate: "2026-09-10",
  doneDate: null,
  memo: "memo",
  archivedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  isVirtual: true,
};

const realTask: TaskItem = {
  id: "task-1",
  userId: "user-1",
  activityId: null,
  activityKindId: null,
  quantity: null,
  title: "Real task",
  startDate: "2026-09-10",
  dueDate: null,
  doneDate: null,
  memo: "",
  archivedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

describe("isVirtualScheduledTask", () => {
  it("isVirtual: true を持つタスクだけを仮想と判定する", () => {
    expect(isVirtualScheduledTask(virtualTask)).toBe(true);
    expect(isVirtualScheduledTask(realTask)).toBe(false);
  });
});

describe("materializeScheduledTask", () => {
  const noExisting = () => vi.fn().mockResolvedValue([]);

  it("仮想タスクの決定的 id と schedule 情報を引き継いで未完了行を作る", async () => {
    const createTask = vi.fn().mockResolvedValue(undefined);
    const getTasksByScheduledDate = noExisting();

    const result = await materializeScheduledTask(
      { createTask, getTasksByScheduledDate },
      virtualTask,
    );

    expect(getTasksByScheduledDate).toHaveBeenCalledWith("2026-09-10", [
      "schedule-1",
    ]);

    expect(createTask).toHaveBeenCalledTimes(1);
    expect(createTask).toHaveBeenCalledWith({
      id: "virtual-1",
      scheduleId: "schedule-1",
      scheduledDate: "2026-09-10",
      title: "Bench press",
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 5,
      startDate: "2026-09-10",
      dueDate: "2026-09-10",
      memo: "memo",
    });
    expect(result).toEqual({
      id: "virtual-1",
      userId: "user-1",
      activityId: "act-1",
      activityKindId: "kind-1",
      quantity: 5,
      scheduleId: "schedule-1",
      scheduledDate: "2026-09-10",
      title: "Bench press",
      startDate: "2026-09-10",
      dueDate: "2026-09-10",
      doneDate: null,
      memo: "memo",
      archivedAt: null,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
    });
    expect(isVirtualScheduledTask(result)).toBe(false);
  });

  it("同 id の行が既にあれば createTask を呼ばず既存行を返す（冪等）", async () => {
    const createTask = vi.fn().mockResolvedValue(undefined);
    const existing: TaskItem = {
      ...realTask,
      id: "virtual-1",
      scheduleId: "schedule-1",
      scheduledDate: "2026-09-10",
      doneDate: "2026-09-10",
    };
    const getTasksByScheduledDate = vi
      .fn()
      .mockResolvedValue([{ ...realTask, id: "other" }, existing]);

    const result = await materializeScheduledTask(
      { createTask, getTasksByScheduledDate },
      virtualTask,
    );

    expect(createTask).not.toHaveBeenCalled();
    expect(result).toBe(existing);
  });

  it("createTask が失敗したらそのまま投げる", async () => {
    const createTask = vi.fn().mockRejectedValue(new Error("insert failed"));

    await expect(
      materializeScheduledTask(
        { createTask, getTasksByScheduledDate: noExisting() },
        virtualTask,
      ),
    ).rejects.toThrow("insert failed");
  });
});
