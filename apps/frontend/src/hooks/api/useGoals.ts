import { apiClient } from "@frontend/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

type GoalFilters = {
  activityId?: string;
  isActive?: boolean;
};

export function useGoals(filters?: GoalFilters) {
  const queryKey = ["goals", filters];

  return useQuery<GetGoalsResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.activityId) params.append("activityId", filters.activityId);
      if (filters?.isActive !== undefined)
        params.append("isActive", filters.isActive.toString());

      const queryString = params.toString();
      const path = queryString ? `/users/goals?${queryString}` : "/users/goals";

      // Use batch API to make the request with query parameters
      const res = await apiClient.batch.$post({
        json: [
          {
            path: path,
          },
        ],
      });
      const json = await res.json();

      const parsed = GetGoalsResponseSchema.safeParse(json[0]);
      if (!parsed.success) {
        throw new Error("Failed to parse goals");
      }

      return parsed.data;
    },
  });
}

export function useGoal(id: string) {
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

export function useCreateGoal() {
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

export function useUpdateGoal() {
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

export function useDeleteGoal() {
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

export function useGoalStats(id: string, enabled = true) {
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
