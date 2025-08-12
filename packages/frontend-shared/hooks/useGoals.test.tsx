import type React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createUseCreateGoal,
  createUseGoal,
  createUseGoalStats,
  createUseGoals,
} from "./useGoals";

describe("Goal Hooks", () => {
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
      goals: {
        $get: vi.fn(),
        $post: vi.fn(),
        ":id": {
          $put: vi.fn(),
          $delete: vi.fn(),
          stats: {
            $get: vi.fn(),
          },
        },
      },
    },
    batch: {
      $post: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createUseGoals", () => {
    it("should fetch goals without filters", async () => {
      const mockGoals = {
        goals: [
          {
            id: "1",
            userId: "00000000-0000-4000-8000-000000000001",
            activityId: "00000000-0000-4000-8000-000000000002",
            isActive: true,
            description: "毎日100回",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dailyTargetQuantity: 100,
            startDate: "2024-01-01",
            endDate: undefined,
            currentBalance: 0,
            totalTarget: 100,
            totalActual: 0,
            inactiveDates: [],
          },
        ],
      };

      mockApiClient.users.goals.$get = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockGoals),
      });

      const { result } = renderHook(
        () => createUseGoals({ apiClient: mockApiClient }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockGoals);
      expect(mockApiClient.users.goals.$get).toHaveBeenCalled();
    });

    it("should fetch goals with filters", async () => {
      const mockGoals = {
        goals: [
          {
            id: "1",
            userId: "00000000-0000-4000-8000-000000000001",
            activityId: "00000000-0000-4000-8000-000000000002",
            isActive: true,
            description: "毎日100回",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dailyTargetQuantity: 100,
            startDate: "2024-01-01",
            endDate: undefined,
            currentBalance: 0,
            totalTarget: 100,
            totalActual: 0,
            inactiveDates: [],
          },
        ],
      };

      mockApiClient.users.goals.$get = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockGoals),
      });

      const { result } = renderHook(
        () =>
          createUseGoals({
            apiClient: mockApiClient,
            filters: {
              activityId: "00000000-0000-4000-8000-000000000002",
              isActive: true,
            },
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockGoals);
      expect(mockApiClient.users.goals.$get).toHaveBeenCalled();
    });
  });

  describe("createUseGoal", () => {
    it("should fetch a single goal by id", async () => {
      const mockGoals = {
        goals: [
          {
            id: "1",
            userId: "00000000-0000-4000-8000-000000000001",
            activityId: "00000000-0000-4000-8000-000000000002",
            isActive: true,
            description: "毎日100回",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dailyTargetQuantity: 100,
            startDate: "2024-01-01",
            endDate: undefined,
            currentBalance: 0,
            totalTarget: 100,
            totalActual: 0,
            inactiveDates: [],
          },
          {
            id: "2",
            userId: "00000000-0000-4000-8000-000000000001",
            activityId: "00000000-0000-4000-8000-000000000003",
            isActive: false,
            description: "毎月200回",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dailyTargetQuantity: 200,
            startDate: "2024-01-01",
            endDate: undefined,
            currentBalance: 0,
            totalTarget: 200,
            totalActual: 0,
            inactiveDates: [],
          },
        ],
      };

      mockApiClient.users.goals.$get = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockGoals),
      });

      const { result } = renderHook(
        () => createUseGoal({ apiClient: mockApiClient, id: "1" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockGoals.goals[0]);
    });

    it("should return null when goal is not found", async () => {
      const mockGoals = {
        goals: [],
      };

      mockApiClient.users.goals.$get = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockGoals),
      });

      const { result } = renderHook(
        () => createUseGoal({ apiClient: mockApiClient, id: "999" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe("createUseCreateGoal", () => {
    it("should create a new goal", async () => {
      const newGoal = {
        activityId: "00000000-0000-4000-8000-000000000002",
        dailyTargetQuantity: 100,
        startDate: "2024-01-01",
        endDate: undefined,
        description: "毎日100回の運動",
      };

      const mockResponse = { id: "new-1", ...newGoal };

      mockApiClient.users.goals.$post = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const { result } = renderHook(
        () => createUseCreateGoal({ apiClient: mockApiClient }),
        { wrapper: createWrapper() },
      );

      await result.current.mutateAsync(newGoal);

      expect(mockApiClient.users.goals.$post).toHaveBeenCalledWith({
        json: newGoal,
      });
    });
  });

  describe("createUseGoalStats", () => {
    it("should fetch goal statistics", async () => {
      const mockStats = {
        goalId: "1",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        dailyRecords: [
          {
            date: "2024-01-01",
            quantity: 100,
            achieved: true,
          },
          {
            date: "2024-01-02",
            quantity: 50,
            achieved: false,
          },
        ],
        stats: {
          average: 75,
          max: 100,
          maxConsecutiveDays: 1,
          achievedDays: 1,
        },
      };

      mockApiClient.users.goals[":id"].stats.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockStats),
      });

      const { result } = renderHook(
        () => createUseGoalStats({ apiClient: mockApiClient, id: "1" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(mockApiClient.users.goals[":id"].stats.$get).toHaveBeenCalledWith({
        param: { id: "1" },
      });
    });

    it("should handle error when stats request fails", async () => {
      mockApiClient.users.goals[":id"].stats.$get = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn(),
      });

      const { result } = renderHook(
        () => createUseGoalStats({ apiClient: mockApiClient, id: "1" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Failed to fetch goal stats");
    });
  });
});
