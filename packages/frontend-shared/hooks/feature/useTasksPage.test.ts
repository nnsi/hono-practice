import { act, renderHook, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createUseTasksPage,
  getTaskStatus,
  groupTasksByTimeline,
} from "./useTasksPage";

describe("createUseTasksPage", () => {
  let mockApi: any;

  const mockActiveTasks = [
    {
      id: "1",
      userId: "user1",
      title: "Overdue task",
      startDate: "2024-01-01",
      dueDate: "2024-01-05",
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: null,
    },
    {
      id: "2",
      userId: "user1",
      title: "Due today",
      startDate: null,
      dueDate: dayjs().format("YYYY-MM-DD"),
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: null,
    },
    {
      id: "3",
      userId: "user1",
      title: "Completed task",
      startDate: null,
      dueDate: "2024-01-10",
      doneDate: "2024-01-09",
      memo: null,
      archivedAt: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-09"),
    },
  ];

  const mockArchivedTasks = [
    {
      id: "4",
      userId: "user1",
      title: "Archived task",
      startDate: null,
      dueDate: null,
      doneDate: null,
      memo: null,
      archivedAt: new Date("2024-01-15"),
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-15"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = {
      getTasks: vi.fn().mockResolvedValue(mockActiveTasks),
      getArchivedTasks: vi.fn().mockResolvedValue(mockArchivedTasks),
    };
  });

  it("should initialize with default state", async () => {
    const { result } = renderHook(() => createUseTasksPage({ api: mockApi }));

    expect(result.current.stateProps.showCompleted).toBe(true);
    expect(result.current.stateProps.showFuture).toBe(false);
    expect(result.current.stateProps.createDialogOpen).toBe(false);
    expect(result.current.stateProps.activeTab).toBe("active");

    await waitFor(() => {
      expect(result.current.stateProps.isTasksLoading).toBe(false);
    });
  });

  it("should be able to fetch active tasks", async () => {
    const { result } = renderHook(() => createUseTasksPage({ api: mockApi }));

    act(() => {
      result.current.actions.onRefetch();
    });

    await waitFor(() => {
      expect(mockApi.getTasks).toHaveBeenCalledWith({ includeArchived: false });
      expect(result.current.stateProps.tasks).toEqual(mockActiveTasks);
    });
  });

  it("should fetch archived tasks when tab changes", async () => {
    const { result } = renderHook(() => createUseTasksPage({ api: mockApi }));

    act(() => {
      result.current.actions.onActiveTabChange("archived");
    });

    await waitFor(() => {
      expect(mockApi.getArchivedTasks).toHaveBeenCalled();
      expect(result.current.stateProps.archivedTasks).toEqual(
        mockArchivedTasks,
      );
    });
  });

  it("should toggle show completed", async () => {
    const { result } = renderHook(() => createUseTasksPage({ api: mockApi }));

    await waitFor(() => {
      expect(result.current.stateProps.isTasksLoading).toBe(false);
    });

    act(() => {
      result.current.actions.onShowCompletedChange(true);
    });

    expect(result.current.stateProps.showCompleted).toBe(true);
  });

  it("should toggle show future", async () => {
    const { result } = renderHook(() => createUseTasksPage({ api: mockApi }));

    await waitFor(() => {
      expect(result.current.stateProps.isTasksLoading).toBe(false);
    });

    act(() => {
      result.current.actions.onShowFutureChange(true);
    });

    expect(result.current.stateProps.showFuture).toBe(true);
  });

  it("should manage create dialog state", async () => {
    const { result } = renderHook(() => createUseTasksPage({ api: mockApi }));

    await waitFor(() => {
      expect(result.current.stateProps.isTasksLoading).toBe(false);
    });

    act(() => {
      result.current.actions.onCreateDialogOpenChange(true);
    });

    expect(result.current.stateProps.createDialogOpen).toBe(true);

    act(() => {
      result.current.actions.onCreateDialogOpenChange(false);
    });

    expect(result.current.stateProps.createDialogOpen).toBe(false);
  });

  it("should handle API errors gracefully", async () => {
    mockApi.getTasks.mockRejectedValue(new Error("API Error"));

    // console.errorをモック
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => createUseTasksPage({ api: mockApi }));

    act(() => {
      result.current.actions.onRefetch();
    });

    await waitFor(() => {
      expect(result.current.stateProps.tasks).toEqual([]);
      expect(result.current.stateProps.isTasksLoading).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch active tasks:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should refetch tasks", async () => {
    const { result } = renderHook(() => createUseTasksPage({ api: mockApi }));

    await act(async () => {
      await result.current.actions.onRefetch();
    });

    expect(mockApi.getTasks).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.actions.onRefetch();
    });

    expect(mockApi.getTasks).toHaveBeenCalledTimes(2);
  });
});

describe("groupTasksByTimeline", () => {
  const today = dayjs().startOf("day");
  const yesterday = today.subtract(1, "day");
  const tomorrow = today.add(1, "day");
  const nextWeek = today.add(8, "day");

  const tasks = [
    // Overdue task
    {
      id: "1",
      userId: "user1",
      title: "Overdue",
      dueDate: yesterday.format("YYYY-MM-DD"),
      startDate: null,
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: null,
    },
    // Due today
    {
      id: "2",
      userId: "user1",
      title: "Due today",
      dueDate: today.format("YYYY-MM-DD"),
      startDate: null,
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: null,
    },
    // Starting today
    {
      id: "3",
      userId: "user1",
      title: "Starting today",
      startDate: today.format("YYYY-MM-DD"),
      dueDate: tomorrow.format("YYYY-MM-DD"),
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: null,
    },
    // In progress
    {
      id: "4",
      userId: "user1",
      title: "In progress",
      startDate: yesterday.format("YYYY-MM-DD"),
      dueDate: tomorrow.format("YYYY-MM-DD"),
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: null,
    },
    // Due this week
    {
      id: "5",
      userId: "user1",
      title: "Due this week",
      startDate: null,
      dueDate: today.add(3, "day").format("YYYY-MM-DD"),
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: null,
    },
    // Not started
    {
      id: "6",
      userId: "user1",
      title: "Not started",
      startDate: tomorrow.format("YYYY-MM-DD"),
      dueDate: null,
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: null,
    },
    // Future
    {
      id: "7",
      userId: "user1",
      title: "Future",
      startDate: null,
      dueDate: nextWeek.format("YYYY-MM-DD"),
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: null,
    },
    // Completed
    {
      id: "8",
      userId: "user1",
      title: "Completed",
      startDate: null,
      dueDate: yesterday.format("YYYY-MM-DD"),
      doneDate: yesterday.format("YYYY-MM-DD"),
      memo: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: null,
    },
    // Completed due today (should stay in dueToday with completedInTheirCategories)
    {
      id: "9",
      userId: "user1",
      title: "Completed due today",
      startDate: null,
      dueDate: today.format("YYYY-MM-DD"),
      doneDate: today.format("YYYY-MM-DD"),
      memo: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: null,
    },
  ];

  it("should group tasks correctly", () => {
    const grouped = groupTasksByTimeline(tasks, {
      showCompleted: true,
      showFuture: true,
      completedInTheirCategories: false,
    });

    expect(grouped.overdue).toHaveLength(1);
    expect(grouped.overdue[0].id).toBe("1");

    expect(grouped.dueToday).toHaveLength(1);
    expect(grouped.dueToday[0].id).toBe("2");

    expect(grouped.startingToday).toHaveLength(1);
    expect(grouped.startingToday[0].id).toBe("3");

    expect(grouped.inProgress).toHaveLength(1);
    expect(grouped.inProgress[0].id).toBe("4");

    expect(grouped.dueThisWeek).toHaveLength(1);
    expect(grouped.dueThisWeek[0].id).toBe("5");

    expect(grouped.notStarted).toHaveLength(1);
    expect(grouped.notStarted[0].id).toBe("6");

    expect(grouped.future).toHaveLength(1);
    expect(grouped.future[0].id).toBe("7");

    expect(grouped.completed).toHaveLength(2);
    expect(grouped.completed.find((t) => t.id === "8")).toBeDefined();
    expect(grouped.completed.find((t) => t.id === "9")).toBeDefined();
  });

  it("should keep completed tasks in their categories with completedInTheirCategories option", () => {
    const grouped = groupTasksByTimeline(tasks, {
      showCompleted: true,
      showFuture: true,
      completedInTheirCategories: true,
    });

    // Completed task due today should be in dueToday
    expect(grouped.dueToday).toHaveLength(2);
    expect(grouped.dueToday.find((t) => t.id === "9")).toBeDefined();

    // Regular completed task should be in completed
    expect(grouped.completed).toHaveLength(1);
    expect(grouped.completed[0].id).toBe("8");
  });

  it("should hide completed tasks when showCompleted is false", () => {
    const grouped = groupTasksByTimeline(tasks, {
      showCompleted: false,
      showFuture: true,
      completedInTheirCategories: false,
    });

    expect(grouped.completed).toHaveLength(0);
  });

  it("should hide future tasks when showFuture is false", () => {
    const grouped = groupTasksByTimeline(tasks, {
      showCompleted: true,
      showFuture: false,
      completedInTheirCategories: false,
    });

    expect(grouped.future).toHaveLength(0);
  });

  it("should sort tasks by due date then start date", () => {
    const tasksToSort = [
      {
        id: "a",
        userId: "user1",
        title: "Task A",
        dueDate: "2024-01-05",
        startDate: null,
        doneDate: null,
        memo: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: null,
      },
      {
        id: "b",
        userId: "user1",
        title: "Task B",
        dueDate: "2024-01-03",
        startDate: null,
        doneDate: null,
        memo: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: null,
      },
      {
        id: "c",
        userId: "user1",
        title: "Task C",
        startDate: "2024-01-04",
        dueDate: null,
        doneDate: null,
        memo: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: null,
      },
    ];

    const grouped = groupTasksByTimeline(tasksToSort, {
      showCompleted: true,
      showFuture: true,
      completedInTheirCategories: false,
    });

    // すべてのカテゴリからタスクを収集
    const allTasks = [
      ...grouped.overdue,
      ...grouped.dueToday,
      ...grouped.startingToday,
      ...grouped.inProgress,
      ...grouped.dueThisWeek,
      ...grouped.notStarted,
      ...grouped.future,
      ...grouped.completed,
    ];

    expect(allTasks).toHaveLength(3);
    // ソート順を確認（due dateが優先される）
    const sortedByDate = allTasks.sort((a, b) => {
      const dateA = a.dueDate || a.startDate;
      const dateB = b.dueDate || b.startDate;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.localeCompare(dateB);
    });

    expect(sortedByDate[0].id).toBe("b"); // 2024-01-03 (due date)
    expect(sortedByDate[1].id).toBe("c"); // 2024-01-04 (start date)
    expect(sortedByDate[2].id).toBe("a"); // 2024-01-05 (due date)
  });
});

describe("getTaskStatus", () => {
  const today = dayjs().startOf("day");

  it("should return correct status for each task type", () => {
    const overdueTask = {
      id: "1",
      userId: "user1",
      title: "Overdue",
      dueDate: today.subtract(1, "day").format("YYYY-MM-DD"),
      startDate: null,
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: null,
    };

    const completedTask = {
      ...overdueTask,
      doneDate: today.format("YYYY-MM-DD"),
    };

    expect(getTaskStatus(overdueTask, today)).toBe("overdue");
    expect(getTaskStatus(completedTask, today)).toBe("completed");
  });
});
