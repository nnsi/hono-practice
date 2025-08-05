import type React from "react";

import * as useSyncedTask from "@frontend/hooks/api/useTasks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GetTaskResponse } from "@dtos/response/GetTasksResponse";

import { useDailyTaskActions } from "../useDailyTaskActions";

// モックの設定
vi.mock("@frontend/hooks/api/useTasks");

describe("useDailyTaskActions", () => {
  let queryClient: QueryClient;
  const mockUpdateTask = vi.fn();
  const mockDeleteTask = vi.fn();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // モックのリセット
    vi.clearAllMocks();

    // useSyncedTaskのモック
    vi.mocked(useSyncedTask.useUpdateTask).mockReturnValue({
      mutate: mockUpdateTask,
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
      status: "idle",
      variables: undefined,
      context: undefined,
      isIdle: true,
      isPaused: false,
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
    } as any);

    vi.mocked(useSyncedTask.useDeleteTask).mockReturnValue({
      mutate: mockDeleteTask,
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
      status: "idle",
      variables: undefined,
      context: undefined,
      isIdle: true,
      isPaused: false,
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
    } as any);
  });

  it("初期状態が正しく設定される", () => {
    const { result } = renderHook(() => useDailyTaskActions(new Date()), {
      wrapper,
    });

    expect(result.current.createDialogOpen).toBe(false);
    expect(result.current.updateTask).toBeDefined();
    expect(result.current.deleteTask).toBeDefined();
  });

  it("createDialogOpenの状態を変更できる", () => {
    const { result } = renderHook(() => useDailyTaskActions(new Date()), {
      wrapper,
    });

    act(() => {
      result.current.setCreateDialogOpen(true);
    });

    expect(result.current.createDialogOpen).toBe(true);

    act(() => {
      result.current.setCreateDialogOpen(false);
    });

    expect(result.current.createDialogOpen).toBe(false);
  });

  it("handleToggleTaskDoneが未完了タスクを完了にする", () => {
    const testDate = new Date("2025-01-20");
    const { result } = renderHook(() => useDailyTaskActions(testDate), {
      wrapper,
    });

    const task: GetTaskResponse = {
      id: "00000000-0000-4000-8000-000000000001",
      userId: "00000000-0000-4000-8000-000000000301",
      title: "Test Task",
      startDate: null,
      dueDate: null,
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2025-01-20T00:00:00Z"),
      updatedAt: new Date("2025-01-20T00:00:00Z"),
    };

    act(() => {
      result.current.handleToggleTaskDone(task);
    });

    expect(mockUpdateTask).toHaveBeenCalledWith({
      id: "00000000-0000-4000-8000-000000000001",
      data: {
        doneDate: "2025-01-20",
      },
    });
  });

  it("handleToggleTaskDoneが完了タスクを未完了にする", () => {
    const testDate = new Date("2025-01-20");
    const { result } = renderHook(() => useDailyTaskActions(testDate), {
      wrapper,
    });

    const task: GetTaskResponse = {
      id: "00000000-0000-4000-8000-000000000002",
      userId: "00000000-0000-4000-8000-000000000301",
      title: "Completed Task",
      startDate: null,
      dueDate: null,
      doneDate: "2025-01-20",
      memo: null,
      archivedAt: null,
      createdAt: new Date("2025-01-20T00:00:00Z"),
      updatedAt: new Date("2025-01-20T00:00:00Z"),
    };

    act(() => {
      result.current.handleToggleTaskDone(task);
    });

    expect(mockUpdateTask).toHaveBeenCalledWith({
      id: "00000000-0000-4000-8000-000000000002",
      data: {
        doneDate: null,
      },
    });
  });

  it("handleDeleteTaskがタスクを削除する", () => {
    const testDate = new Date("2025-01-20");
    const { result } = renderHook(() => useDailyTaskActions(testDate), {
      wrapper,
    });

    const task: GetTaskResponse = {
      id: "00000000-0000-4000-8000-000000000003",
      userId: "00000000-0000-4000-8000-000000000301",
      title: "Task to Delete",
      startDate: null,
      dueDate: null,
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2025-01-20T00:00:00Z"),
      updatedAt: new Date("2025-01-20T00:00:00Z"),
    };

    const mockEvent = {
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleDeleteTask(mockEvent, task);
    });

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(mockDeleteTask).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000003",
    );
  });

  it("異なる日付で正しくフォーマットされる", () => {
    const testDate = new Date("2024-12-31");
    const { result } = renderHook(() => useDailyTaskActions(testDate), {
      wrapper,
    });

    const task: GetTaskResponse = {
      id: "00000000-0000-4000-8000-000000000004",
      userId: "00000000-0000-4000-8000-000000000301",
      title: "Year End Task",
      startDate: null,
      dueDate: null,
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2024-12-31T00:00:00Z"),
      updatedAt: new Date("2024-12-31T00:00:00Z"),
    };

    act(() => {
      result.current.handleToggleTaskDone(task);
    });

    expect(mockUpdateTask).toHaveBeenCalledWith({
      id: "00000000-0000-4000-8000-000000000004",
      data: {
        doneDate: "2024-12-31",
      },
    });
  });
});
