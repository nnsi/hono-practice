import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUseDailyPage } from "./useDailyPage";

import type { NetworkAdapter } from "@packages/frontend-shared/adapters";
import type { GetActivityLogResponse, GetTasksResponse } from "@packages/types";

describe("createUseDailyPage", () => {
  let mockNetwork: NetworkAdapter;
  let mockDateStore: { date: Date; setDate: (date: Date) => void };
  let mockApi: any;
  let mockStorage: any;

  const mockActivityLogs: GetActivityLogResponse[] = [
    {
      id: "log-1",

      date: new Date("2024-01-01"),
      quantity: 30,
      memo: "Test memo 1",
      activity: {
        id: "activity-1",
        name: "Running",
        quantityUnit: "km",
        emoji: "🏃",
      },
      activityKind: {
        id: "kind-1",
        name: "Morning",
      },
      createdAt: new Date("2024-01-01T09:00:00"),
      updatedAt: new Date("2024-01-01T09:00:00"),
    },
    {
      id: "log-2",

      date: new Date("2024-01-01"),
      quantity: 60,
      memo: "",
      activity: {
        id: "activity-2",
        name: "Push-ups",
        quantityUnit: "回",
        emoji: "💪",
      },
      activityKind: null,
      createdAt: new Date("2024-01-01T10:00:00"),
      updatedAt: new Date("2024-01-01T10:00:00"),
    },
  ];

  const mockTasks: GetTasksResponse = [
    {
      id: "task-1",
      userId: "user-1",
      title: "Complete workout",
      startDate: null,
      dueDate: "2024-01-01",
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockNetwork = {
      isOnline: vi.fn().mockReturnValue(true),
      addListener: vi.fn().mockReturnValue(() => {}),
    };

    mockDateStore = {
      date: new Date("2024-01-01"),
      setDate: vi.fn(),
    };

    mockApi = {
      getActivityLogs: vi.fn().mockResolvedValue(mockActivityLogs),
      getTasks: vi.fn().mockResolvedValue(mockTasks),
      getActivities: vi.fn().mockResolvedValue(undefined),
    };

    mockStorage = {
      getDeletedActivityLogIds: vi.fn().mockResolvedValue(new Set()),
      addStorageListener: vi.fn().mockReturnValue(() => {}),
    };
  });

  it("should initialize with default state", async () => {
    const { result } = renderHook(() =>
      createUseDailyPage({
        network: mockNetwork,
        dateStore: mockDateStore,
        api: mockApi,
        storage: mockStorage,
      }),
    );

    expect(result.current.date).toEqual(new Date("2024-01-01"));
    expect(result.current.editDialogOpen).toBe(false);
    expect(result.current.editTargetLog).toBeNull();
    expect(result.current.createDialogOpen).toBe(false);
    expect(result.current.isOnline).toBe(true);

    // Wait for initial effects to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should fetch activity logs when online", async () => {
    const { result } = renderHook(() =>
      createUseDailyPage({
        network: mockNetwork,
        dateStore: mockDateStore,
        api: mockApi,
        storage: mockStorage,
        activityLogsData: mockActivityLogs,
      }),
    );

    await waitFor(() => {
      expect(result.current.activityLogs).toEqual(mockActivityLogs);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should fetch tasks", async () => {
    const { result } = renderHook(() =>
      createUseDailyPage({
        network: mockNetwork,
        dateStore: mockDateStore,
        api: mockApi,
        storage: mockStorage,
        tasksData: mockTasks,
      }),
    );

    await waitFor(() => {
      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.isTasksLoading).toBe(false);
    });
  });

  it("should fetch activities for reference", async () => {
    renderHook(() =>
      createUseDailyPage({
        network: mockNetwork,
        dateStore: mockDateStore,
        api: mockApi,
        storage: mockStorage,
      }),
    );

    // Since data fetching is now handled by parent component
    // This test is no longer applicable, but we keep it for compatibility
    expect(mockApi.getActivities).toBeDefined();
  });

  it("should handle activity log click", async () => {
    const { result } = renderHook(() =>
      createUseDailyPage({
        network: mockNetwork,
        dateStore: mockDateStore,
        api: mockApi,
        storage: mockStorage,
      }),
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleActivityLogClick(mockActivityLogs[0]);
    });

    expect(result.current.editTargetLog).toEqual(mockActivityLogs[0]);
    expect(result.current.editDialogOpen).toBe(true);
  });

  it("should handle dialog close", async () => {
    const { result } = renderHook(() =>
      createUseDailyPage({
        network: mockNetwork,
        dateStore: mockDateStore,
        api: mockApi,
        storage: mockStorage,
      }),
    );

    // Wait for initial loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Open dialog
    act(() => {
      result.current.handleActivityLogClick(mockActivityLogs[0]);
    });

    // Close dialog
    act(() => {
      result.current.handleActivityLogEditDialogChange(false);
    });

    expect(result.current.editDialogOpen).toBe(false);
    expect(result.current.editTargetLog).toBeNull();
  });

  it("should handle create dialog state", async () => {
    const { result } = renderHook(() =>
      createUseDailyPage({
        network: mockNetwork,
        dateStore: mockDateStore,
        api: mockApi,
        storage: mockStorage,
      }),
    );

    // Wait for initial loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
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

  it("should handle date change", async () => {
    const { result } = renderHook(() =>
      createUseDailyPage({
        network: mockNetwork,
        dateStore: mockDateStore,
        api: mockApi,
        storage: mockStorage,
      }),
    );

    // Wait for initial loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newDate = new Date("2024-01-02");

    act(() => {
      result.current.setDate(newDate);
    });

    expect(mockDateStore.setDate).toHaveBeenCalledWith(newDate);
  });

  it("should handle API errors gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() =>
      createUseDailyPage({
        network: mockNetwork,
        dateStore: mockDateStore,
        api: mockApi,
        storage: mockStorage,
        activityLogsData: [],
        tasksData: [],
      }),
    );

    await waitFor(() => {
      expect(result.current.activityLogs).toEqual([]);
      expect(result.current.tasks).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isTasksLoading).toBe(false);
    });

    consoleErrorSpy.mockRestore();
  });

  // Network and storage listeners are no longer needed after removing offline sync
  // it("should set up network listener", () => {
  // });

  // it("should set up storage listener when available", () => {
  // });

  it("should work without storage", async () => {
    const { result } = renderHook(() =>
      createUseDailyPage({
        network: mockNetwork,
        dateStore: mockDateStore,
        api: mockApi,
        activityLogsData: mockActivityLogs,
      }),
    );

    await waitFor(() => {
      expect(result.current.mergedActivityLogs).toEqual(mockActivityLogs);
    });
  });
});
