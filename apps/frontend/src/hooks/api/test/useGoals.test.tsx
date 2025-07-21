import type { ReactNode } from "react";

import { apiClient } from "@frontend/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateGoalRequest, UpdateGoalRequest } from "@dtos/request";
import type { GoalStatsResponse } from "@dtos/response";

import {
  useCreateGoal,
  useDeleteGoal,
  useGoal,
  useGoalStats,
  useGoals,
  useUpdateGoal,
} from "../useGoals";

// モック
vi.mock("@frontend/utils/apiClient", () => {
  const mockStats$get = vi.fn();
  const mock$put = vi.fn();
  const mock$delete = vi.fn();

  return {
    apiClient: {
      batch: {
        $post: vi.fn(),
      },
      users: {
        goals: {
          $get: vi.fn(),
          $post: vi.fn(),
          ":id": {
            $put: mock$put,
            $delete: mock$delete,
            stats: {
              $get: mockStats$get,
            },
          },
        },
      },
    },
  };
});

describe("useGoals", () => {
  let queryClient: QueryClient;
  const mockApiClient = apiClient as any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  describe("useGoals", () => {
    it("ゴール一覧を正常に取得する", async () => {
      const mockGoals = [
        {
          id: "00000000-0000-4000-8000-000000000001",
          userId: "00000000-0000-4000-8000-000000000001",
          activityId: "00000000-0000-4000-8000-000000000002",
          isActive: true,
          description: "週3回ランニング",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          dailyTargetQuantity: 30,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          currentBalance: 0,
          totalTarget: 10950,
          totalActual: 0,
          inactiveDates: ["2024-01-02", "2024-01-05"],
        },
        {
          id: "00000000-0000-4000-8000-000000000002",
          userId: "00000000-0000-4000-8000-000000000001",
          activityId: "00000000-0000-4000-8000-000000000003",
          isActive: true,
          description: "毎日読書30分",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          dailyTargetQuantity: 30,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          currentBalance: 0,
          totalTarget: 10950,
          totalActual: 0,
          inactiveDates: [],
        },
      ];

      vi.mocked(mockApiClient.batch.$post).mockResolvedValue({
        json: vi.fn().mockResolvedValue([{ goals: mockGoals }]),
      } as any);

      const { result } = renderHook(() => useGoals(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.goals).toEqual(mockGoals);
      expect(result.current.data?.goals).toHaveLength(2);
    });

    it("フィルタ付きでゴール一覧を取得する", async () => {
      const activityId = "00000000-0000-4000-8000-000000000003";
      const mockGoals = [
        {
          id: "00000000-0000-4000-8000-000000000001",
          userId: "00000000-0000-4000-8000-000000000001",
          activityId,
          isActive: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          dailyTargetQuantity: 30,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          currentBalance: 0,
          totalTarget: 10950,
          totalActual: 0,
          inactiveDates: [],
        },
      ];

      vi.mocked(mockApiClient.batch.$post).mockResolvedValue({
        json: vi.fn().mockResolvedValue([{ goals: mockGoals }]),
      } as any);

      const { result } = renderHook(
        () => useGoals({ activityId, isActive: true }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // バッチAPIが正しいクエリパラメータで呼ばれたことを確認
      expect(mockApiClient.batch.$post).toHaveBeenCalledWith({
        json: [
          {
            path: `/users/goals?activityId=${activityId}&isActive=true`,
          },
        ],
      });
    });

    it("パースエラー時に例外をスローする", async () => {
      vi.mocked(mockApiClient.batch.$post).mockResolvedValue({
        json: vi.fn().mockResolvedValue([{ invalid: "data" }]),
      } as any);

      const { result } = renderHook(() => useGoals(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Failed to parse goals");
    });
  });

  describe("useGoal", () => {
    it("特定のゴールを正常に取得する", async () => {
      const goalId = "00000000-0000-4000-8000-000000000001";
      const mockGoal = {
        id: goalId,
        userId: "00000000-0000-4000-8000-000000000001",
        activityId: "00000000-0000-4000-8000-000000000002",
        isActive: true,
        description: "目標ゴール",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        dailyTargetQuantity: 30,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        currentBalance: 0,
        totalTarget: 10950,
        totalActual: 0,
        inactiveDates: ["2024-01-03", "2024-01-07"],
      };

      vi.mocked(mockApiClient.users.goals.$get).mockResolvedValue({
        json: vi.fn().mockResolvedValue({ goals: [mockGoal] }),
      } as any);

      const { result } = renderHook(() => useGoal(goalId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockGoal);
      expect(result.current.data?.description).toBe("目標ゴール");
    });

    it("ゴールが見つからない場合はnullを返す", async () => {
      const goalId = "00000000-0000-4000-8000-000000000001";

      vi.mocked(mockApiClient.users.goals.$get).mockResolvedValue({
        json: vi.fn().mockResolvedValue({ goals: [] }),
      } as any);

      const { result } = renderHook(() => useGoal(goalId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it("IDが空の場合はクエリを実行しない", () => {
      const { result } = renderHook(() => useGoal(""), {
        wrapper: createWrapper(),
      });

      // enabled:falseの場合は実行されない
      expect(result.current.data).toBeUndefined();
      expect(result.current.isSuccess).toBe(false);
      expect(mockApiClient.users.goals.$get).not.toHaveBeenCalled();
    });
  });

  describe("useCreateGoal", () => {
    it("ゴールを正常に作成する", async () => {
      const newGoalData: CreateGoalRequest = {
        activityId: "00000000-0000-4000-8000-000000000001",
        dailyTargetQuantity: 30,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        description: "新しいゴール",
      };

      const mockCreatedGoal = {
        id: "00000000-0000-4000-8000-000000000002",
        userId: "00000000-0000-4000-8000-000000000001",
        activityId: newGoalData.activityId,
        isActive: true,
        description: newGoalData.description,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        dailyTargetQuantity: newGoalData.dailyTargetQuantity,
        startDate: newGoalData.startDate,
        endDate: newGoalData.endDate,
        currentBalance: 0,
        totalTarget: newGoalData.dailyTargetQuantity * 365,
        totalActual: 0,
        inactiveDates: [],
      };

      vi.mocked(mockApiClient.users.goals.$post).mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockCreatedGoal),
      } as any);

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreateGoal(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newGoalData);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.users.goals.$post).toHaveBeenCalledWith({
        json: newGoalData,
      });

      // キャッシュが無効化されたことを確認
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["goals"] });
    });

    it("バリデーションエラー時に例外をスローする", async () => {
      const invalidGoalData = {
        // 必須フィールドが欠けている
        name: "不完全なゴール",
      } as any;

      const { result } = renderHook(() => useCreateGoal(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(invalidGoalData);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useUpdateGoal", () => {
    it("ゴールを正常に更新する", async () => {
      const goalId = "00000000-0000-4000-8000-000000000001";
      const updateData: UpdateGoalRequest = {
        dailyTargetQuantity: 150,
        description: "更新されたゴール",
      };

      const mockUpdatedGoal = {
        id: goalId,
        userId: "00000000-0000-4000-8000-000000000001",
        activityId: "00000000-0000-4000-8000-000000000002",
        isActive: true,
        description: updateData.description,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        dailyTargetQuantity: updateData.dailyTargetQuantity || 30,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        currentBalance: 0,
        totalTarget: 10950,
        totalActual: 0,
        inactiveDates: ["2024-01-04"],
      };

      vi.mocked(mockApiClient.users.goals[":id"].$put).mockImplementation(
        ({ param, json }: { param: any; json: any }) => {
          expect(param).toEqual({ id: goalId });
          expect(json).toEqual(updateData);
          return Promise.resolve({
            json: vi.fn().mockResolvedValue(mockUpdatedGoal),
          } as any);
        },
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useUpdateGoal(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: goalId, data: updateData });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.users.goals[":id"].$put).toHaveBeenCalled();

      // キャッシュが無効化されたことを確認
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["goals"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["goal"] });
    });
  });

  describe("useDeleteGoal", () => {
    it("ゴールを正常に削除する", async () => {
      const goalId = "00000000-0000-4000-8000-000000000001";

      vi.mocked(mockApiClient.users.goals[":id"].$delete).mockImplementation(
        ({ param }: { param: any }) => {
          expect(param).toEqual({ id: goalId });
          return Promise.resolve({
            json: vi.fn().mockResolvedValue({ success: true }),
          } as any);
        },
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useDeleteGoal(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(goalId);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.users.goals[":id"].$delete).toHaveBeenCalled();

      // キャッシュが無効化されたことを確認
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["goals"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["goal"] });
    });
  });

  describe("useGoalStats", () => {
    it("ゴールの統計情報を正常に取得する", async () => {
      const goalId = "00000000-0000-4000-8000-000000000001";
      const mockStats: GoalStatsResponse = {
        goalId,
        startDate: "2024-01-15",
        endDate: "2024-01-21",
        dailyRecords: [
          {
            date: "2024-01-15",
            quantity: 30,
            achieved: true,
          },
          {
            date: "2024-01-16",
            quantity: 45,
            achieved: true,
          },
        ],
        stats: {
          average: 37.5,
          max: 45,
          maxConsecutiveDays: 2,
          achievedDays: 2,
        },
      };

      // 他の成功しているテストパターンに合わせる
      vi.mocked(mockApiClient.users.goals[":id"].stats.$get).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockStats),
      } as any);

      const { result } = renderHook(() => useGoalStats(goalId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(result.current.data?.stats.average).toBe(37.5);
      expect(result.current.data?.stats.achievedDays).toBe(2);
    });

    it("APIエラー時にエラー状態になる", async () => {
      const goalId = "00000000-0000-4000-8000-000000000001";

      vi.mocked(mockApiClient.users.goals[":id"].stats.$get).mockImplementation(
        () => {
          return Promise.resolve({
            ok: false,
            json: vi.fn(),
          } as any);
        },
      );

      const { result } = renderHook(() => useGoalStats(goalId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Failed to fetch goal stats");
    });

    it("enabledがfalseの場合はクエリを実行しない", () => {
      const goalId = "00000000-0000-4000-8000-000000000001";

      const { result } = renderHook(() => useGoalStats(goalId, false), {
        wrapper: createWrapper(),
      });

      // enabledがfalseの場合、isPendingくfalseではなくisIdleがtrueになるかもしれません
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(
        mockApiClient.users.goals[":id"].stats.$get,
      ).not.toHaveBeenCalled();
    });

    it("IDが空の場合はクエリを実行しない", () => {
      const { result } = renderHook(() => useGoalStats(""), {
        wrapper: createWrapper(),
      });

      // IDが空の場合、enabledがfalseになる
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(
        mockApiClient.users.goals[":id"].stats.$get,
      ).not.toHaveBeenCalled();
    });
  });
});
