import { apiClient, qp } from "@frontend/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  CreateDebtGoalRequestSchema,
  CreateMonthlyGoalRequestSchema,
  type CreateDebtGoalRequest,
  type CreateMonthlyGoalRequest,
} from "@dtos/request";
import {
  GetGoalsResponseSchema,
  type GetGoalsResponse,
  type GoalResponse,
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
      if (filters?.isActive !== undefined) params.append("isActive", filters.isActive.toString());
      
      const queryString = params.toString();
      const path = queryString ? `/users/goals?${queryString}` : "/users/goals";
      
      // Use batch API to make the request with query parameters
      const res = await apiClient.batch.$post({
        json: [{
          path: path,
        }],
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
        json: [{
          path: `/users/goals/${type}/${id}`,
        }],
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

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ type, id }: { type: "debt" | "monthly_target"; id: string }) => {
      // For now, throw error as delete is not implemented in backend
      throw new Error("Goal deletion is not implemented yet");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}