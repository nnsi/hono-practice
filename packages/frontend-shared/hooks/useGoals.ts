import type { AppType } from "@backend/app";
import {
  type CreateGoalRequest,
  CreateGoalRequestSchema,
  type UpdateGoalRequest,
  UpdateGoalRequestSchema,
} from "@dtos/request";
import {
  type GetGoalsResponse,
  GetGoalsResponseSchema,
  type GoalResponse,
  type GoalStatsResponse,
  GoalStatsResponseSchema,
} from "@dtos/response";
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export type GoalFilters = {
  activityId?: string;
  isActive?: boolean;
};

export type UseGoalsOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
  filters?: GoalFilters;
};

export type UseGoalOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
  id: string;
};

export type UseGoalStatsOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
  id: string;
  enabled?: boolean;
};

export type MutationOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

/**
 * Goals一覧を取得する共通フック
 */
export function createUseGoals(
  options: UseGoalsOptions,
): UseQueryResult<GetGoalsResponse> {
  const { apiClient, filters } = options;
  const queryKey = ["goals", filters];

  return useQuery<GetGoalsResponse>({
    queryKey,
    queryFn: async () => {
      // 直接GETリクエストを使用
      const res = await apiClient.users.goals.$get();
      const json = await res.json();

      const parsed = GetGoalsResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("Failed to parse goals");
      }

      // フィルタリングが必要な場合はクライアント側で実施
      let filteredGoals = parsed.data.goals;
      if (filters?.activityId) {
        filteredGoals = filteredGoals.filter(
          (g) => g.activityId === filters.activityId,
        );
      }
      if (filters?.isActive !== undefined) {
        const now = new Date();
        filteredGoals = filteredGoals.filter((g) => {
          const isActive = !g.endDate || new Date(g.endDate) >= now;
          return isActive === filters.isActive;
        });
      }

      return { ...parsed.data, goals: filteredGoals };
    },
  });
}

/**
 * 単一のGoalを取得する共通フック
 */
export function createUseGoal(
  options: UseGoalOptions,
): UseQueryResult<GoalResponse | null> {
  const { apiClient, id } = options;

  return useQuery<GoalResponse | null>({
    queryKey: ["goal", id],
    queryFn: async () => {
      const res = await apiClient.users.goals.$get();
      const json = await res.json();
      const parsed = GetGoalsResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("Failed to parse goals");
      }
      const goal = parsed.data.goals.find((g) => g.id === id);
      return goal ?? null;
    },
    enabled: !!id,
  });
}

/**
 * Goal作成用の共通フック
 */
export function createUseCreateGoal(
  options: MutationOptions,
): UseMutationResult<any, Error, CreateGoalRequest> {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGoalRequest) => {
      const validated = CreateGoalRequestSchema.parse(data);
      const res = await apiClient.users.goals.$post({
        json: validated,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

/**
 * Goal更新用の共通フック
 */
export function createUseUpdateGoal(
  options: MutationOptions,
): UseMutationResult<any, Error, { id: string; data: UpdateGoalRequest }> {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; data: UpdateGoalRequest }) => {
      const { id, data } = params;
      const validated = UpdateGoalRequestSchema.parse(data);
      const res = await apiClient.users.goals[":id"].$put({
        param: { id },
        json: validated,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal"] });
    },
  });
}

/**
 * Goal削除用の共通フック
 */
export function createUseDeleteGoal(
  options: MutationOptions,
): UseMutationResult<any, Error, string> {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.users.goals[":id"].$delete({
        param: { id },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal"] });
    },
  });
}

/**
 * Goal統計情報を取得する共通フック
 */
export function createUseGoalStats(
  options: UseGoalStatsOptions,
): UseQueryResult<GoalStatsResponse> {
  const { apiClient, id, enabled = true } = options;

  return useQuery<GoalStatsResponse>({
    queryKey: ["goalStats", id],
    queryFn: async () => {
      const res = await apiClient.users.goals[":id"].stats.$get({
        param: { id },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch goal stats");
      }

      const json = await res.json();
      const parsed = GoalStatsResponseSchema.safeParse(json);

      if (!parsed.success) {
        throw new Error("Failed to parse goal stats");
      }

      return parsed.data;
    },
    enabled: enabled && !!id,
  });
}
