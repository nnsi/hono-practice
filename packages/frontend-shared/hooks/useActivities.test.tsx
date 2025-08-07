import type React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUseActivities } from "./useActivities";

describe("createUseActivities", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const mockApiClient = {
    users: {
      activities: {
        $get: vi.fn(),
      },
    },
    batch: {
      $post: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch only activities when date is not provided", async () => {
    const mockActivities = [
      {
        id: "1",
        name: "Activity 1",
        iconType: "emoji" as const,
        emoji: "🏃",
        quantityUnit: "時間",
        kinds: [],
        showCombinedStats: false,
      },
      {
        id: "2",
        name: "Activity 2",
        iconType: "emoji" as const,
        emoji: "📚",
        quantityUnit: "時間",
        kinds: [],
        showCombinedStats: false,
      },
    ];

    mockApiClient.users.activities.$get = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockActivities),
    });

    const useActivities = createUseActivities({ apiClient: mockApiClient });
    const { result } = renderHook(() => useActivities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activities).toEqual(mockActivities);
    expect(result.current.activityLogs).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockApiClient.users.activities.$get).toHaveBeenCalledTimes(1);
    expect(mockApiClient.batch.$post).not.toHaveBeenCalled();
  });

  it("should fetch activities and activity logs when date is provided", async () => {
    const mockActivities = [
      {
        id: "1",
        name: "Activity 1",
        iconType: "emoji" as const,
        emoji: "🏃",
        quantityUnit: "時間",
        kinds: [],
        showCombinedStats: false,
      },
      {
        id: "2",
        name: "Activity 2",
        iconType: "emoji" as const,
        emoji: "📚",
        quantityUnit: "時間",
        kinds: [],
        showCombinedStats: false,
      },
    ];

    const mockActivityLogs = [
      {
        id: "log1",
        date: "2024-01-15",
        quantity: 1.5,
        activity: {
          id: "1",
          name: "Activity 1",
          quantityUnit: "時間",
          emoji: "🏃",
          iconType: "emoji" as const,
        },
        activityKind: null,
        createdAt: new Date("2024-01-15T10:00:00Z"),
        updatedAt: new Date("2024-01-15T10:00:00Z"),
        memo: "",
      },
      {
        id: "log2",
        date: "2024-01-15",
        quantity: 0.5,
        activity: {
          id: "2",
          name: "Activity 2",
          quantityUnit: "時間",
          emoji: "📚",
          iconType: "emoji" as const,
        },
        activityKind: null,
        createdAt: new Date("2024-01-15T11:00:00Z"),
        updatedAt: new Date("2024-01-15T11:00:00Z"),
        memo: "",
      },
    ];

    mockApiClient.batch.$post = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue([mockActivities, mockActivityLogs]),
    });

    const testDate = new Date("2024-01-15");

    const useActivities = createUseActivities({ apiClient: mockApiClient });
    const { result } = renderHook(() => useActivities(testDate), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activities).toEqual(mockActivities);
    expect(result.current.activityLogs).toEqual(mockActivityLogs);
    expect(result.current.error).toBeNull();
    expect(mockApiClient.batch.$post).toHaveBeenCalledWith({
      json: [
        { path: "/users/activities" },
        { path: "/users/activity-logs?date=2024-01-15" },
      ],
    });
    expect(mockApiClient.users.activities.$get).not.toHaveBeenCalled();
  });

  it("should handle error when activities parsing fails", async () => {
    mockApiClient.users.activities.$get = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ invalid: "data" }),
    });

    const useActivities = createUseActivities({ apiClient: mockApiClient });
    const { result } = renderHook(() => useActivities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe("Failed to parse activities");
    expect(result.current.activities).toEqual([]);
    expect(result.current.activityLogs).toEqual([]);
  });

  it("should handle error when activity logs parsing fails", async () => {
    const mockActivities = [
      {
        id: "1",
        name: "Activity 1",
        iconType: "emoji" as const,
        emoji: "🏃",
        quantityUnit: "時間",
        kinds: [],
        showCombinedStats: false,
      },
    ];

    mockApiClient.batch.$post = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue([mockActivities, { invalid: "logs" }]),
    });

    const testDate = new Date("2024-01-15");

    const useActivities = createUseActivities({ apiClient: mockApiClient });
    const { result } = renderHook(() => useActivities(testDate), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe("Failed to parse activity logs");
    expect(result.current.activities).toEqual([]);
    expect(result.current.activityLogs).toEqual([]);
  });
});
