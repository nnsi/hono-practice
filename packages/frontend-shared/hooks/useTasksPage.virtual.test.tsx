import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createVirtualTasksPageHarness,
  makeTask,
  today,
  virtualId,
} from "./useTasksPage.virtual.harness";

describe("useTasksPage 仮想タスクの表示と実体化", () => {
  const { state, mocks, useTasksPage, reset } = createVirtualTasksPageHarness();

  beforeEach(reset);

  it("今日該当するスケジュールを仮想タスクとして実 Task と一緒に dueToday に表示する", () => {
    const { result } = renderHook(() => useTasksPage());

    expect(result.current.tasks.map((t) => t.id)).toEqual([
      "task-1",
      virtualId,
    ]);
    const virtual = result.current.groupedTasks.dueToday.find(
      (t) => t.id === virtualId,
    );
    expect(virtual).toMatchObject({
      title: "Bench press",
      scheduleId: "schedule-1",
      scheduledDate: today,
      doneDate: null,
    });
    expect(result.current.hasAnyTasks).toBe(true);
  });

  it("今日の Task 行が既にあるスケジュールは仮想タスクを出さない（二重表示しない）", () => {
    // 完了 → 未完了に戻した後の状態: 実 Task 行が未完了で残っている
    state.activeTasks = [
      makeTask({
        id: virtualId,
        title: "Bench press",
        scheduleId: "schedule-1",
        scheduledDate: today,
      }),
    ];
    state.tasksOnDate = [{ scheduleId: "schedule-1", scheduledDate: today }];

    const { result } = renderHook(() => useTasksPage());

    expect(result.current.tasks.filter((t) => t.id === virtualId)).toHaveLength(
      1,
    );
  });

  it("完了トグルで先に実体化してから既存 toggle を呼び ActivityLog を作る", async () => {
    const { result } = renderHook(() => useTasksPage());
    const virtual = result.current.tasks.find((t) => t.id === virtualId);
    if (!virtual) throw new Error("virtual task not found");

    await act(async () => {
      await result.current.handleToggleDone(virtual);
    });

    expect(mocks.createTask).toHaveBeenCalledTimes(1);
    expect(mocks.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        id: virtualId,
        scheduleId: "schedule-1",
        scheduledDate: today,
      }),
    );
    expect(mocks.createTask.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.updateTask.mock.invocationCallOrder[0],
    );
    expect(mocks.updateTask).toHaveBeenCalledWith(virtualId, {
      doneDate: today,
    });
    expect(mocks.createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({ activityId: "act-1", taskId: virtualId }),
    );
  });

  it("削除（今日はやらない）で実体化してから softDelete する", async () => {
    const { result } = renderHook(() => useTasksPage());

    await act(async () => {
      await result.current.handleDelete(virtualId);
    });

    expect(mocks.createTask).toHaveBeenCalledTimes(1);
    expect(mocks.softDeleteTask).toHaveBeenCalledWith(virtualId);
    expect(mocks.createTask.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.softDeleteTask.mock.invocationCallOrder[0],
    );
    expect(result.current.deleteConfirmId).toBeNull();
  });

  it("実 Task の削除・完了では createTask を呼ばない", async () => {
    const { result } = renderHook(() => useTasksPage());

    await act(async () => {
      await result.current.handleDelete("task-1");
      await result.current.handleToggleDone(makeTask());
    });

    expect(mocks.createTask).not.toHaveBeenCalled();
    expect(mocks.softDeleteTask).toHaveBeenCalledWith("task-1");
    expect(mocks.updateTask).toHaveBeenCalledWith("task-1", {
      doneDate: today,
    });
  });
});
