import { apiClient } from "@frontend/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type CreateDebtGoalRequest,
  CreateDebtGoalRequestSchema,
  type CreateMonthlyGoalRequest,
  CreateMonthlyGoalRequestSchema,
  type UpdateDebtGoalRequest,
  UpdateDebtGoalRequestSchema,
  type UpdateMonthlyGoalRequest,
  UpdateMonthlyGoalRequestSchema,
} from "@dtos/request";
import {
  type GetGoalsResponse,
  GetGoalsResponseSchema,
  type GoalResponse,
  type GoalStatsResponse,
  GoalStatsResponseSchema,
} from "@dtos/response";

type GoalFilters = {
  type?: "debt" | "monthly_target";
  activityId?: string;
  isActive?: boolean;
};

export function useGoals(filters?: GoalFilters) {
  const queryKey = ["goals", filters];

  return useQuery<GetGoalsResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.type) params.append("type", filters.type);
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

export function useGoal(type: "debt" | "monthly_target", id: string) {
  return useQuery<GoalResponse>({
    queryKey: ["goal", type, id],
    queryFn: async () => {
      const res = await apiClient.batch.$post({
        json: [
          {
            path: `/users/goals/${type}/${id}`,
          },
        ],
      });
      const json = await res.json();
      return json[0] as GoalResponse;
    },
    enabled: !!id && !!type,
  });
}

export function useCreateDebtGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDebtGoalRequest) => {
      const validated = CreateDebtGoalRequestSchema.parse(data);
      const res = await apiClient.users.goals.debt.$post({
        json: validated,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useCreateMonthlyGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMonthlyGoalRequest) => {
      const validated = CreateMonthlyGoalRequestSchema.parse(data);
      const res = await apiClient.users.goals.monthly.$post({
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
    mutationFn: async (params: {
      type: "debt" | "monthly_target";
      id: string;
      data: UpdateDebtGoalRequest | UpdateMonthlyGoalRequest;
    }) => {
      const { type, id, data } = params;

      if (type === "debt") {
        const validated = UpdateDebtGoalRequestSchema.parse(data);
        const res = await apiClient.users.goals.debt[":id"].$put({
          param: { id },
          json: validated,
        });
        return res.json();
      }
      const validated = UpdateMonthlyGoalRequestSchema.parse(data);
      const res = await apiClient.users.goals.monthly_target[":id"].$put({
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
    mutationFn: async (params: {
      type: "debt" | "monthly_target";
      id: string;
    }) => {
      const { type, id } = params;
      const res = await apiClient.users.goals[":type"][":id"].$delete({
        param: { type, id },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal"] });
    },
  });
}

export function useGoalStats(
  type: "debt" | "monthly_target",
  id: string,
  enabled = true,
) {
  return useQuery<GoalStatsResponse>({
    queryKey: ["goalStats", type, id],
    queryFn: async () => {
      const res = await apiClient.users.goals[":type"][":id"].stats.$get({
        param: { type, id },
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
    enabled: enabled && !!id && !!type,
  });
}
