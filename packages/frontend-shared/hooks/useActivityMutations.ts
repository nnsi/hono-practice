import type { AppType } from "@backend/app";
import type {
  CreateActivityRequest,
  UpdateActivityRequest,
} from "@dtos/request";
import type { GetActivitiesResponse } from "@dtos/response";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { buildOptimisticActivity } from "../utils/optimisticData";

export type UseActivityMutationsOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

export function createUseCreateActivity(options: UseActivityMutationsOptions) {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-activity"],
    mutationFn: async (data: CreateActivityRequest) => {
      const res = await apiClient.users.activities.$post({
        json: data,
      });
      if (!res.ok) {
        throw new Error("Failed to create activity");
      }
      return res.json();
    },
    onMutate: async (newActivity) => {
      await queryClient.cancelQueries({ queryKey: ["activity"] });
      const previousActivities =
        queryClient.getQueryData<GetActivitiesResponse>(["activity"]);
      const optimistic = buildOptimisticActivity(newActivity);
      queryClient.setQueryData<GetActivitiesResponse>(["activity"], (old) => [
        ...(old ?? []),
        optimistic,
      ]);
      return { previousActivities };
    },
    onError: (_err, _newActivity, context) => {
      if (context?.previousActivities) {
        queryClient.setQueryData(["activity"], context.previousActivities);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function createUseUpdateActivity(options: UseActivityMutationsOptions) {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-activity"],
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateActivityRequest;
    }) => {
      const res = await apiClient.users.activities[":id"].$put({
        param: { id },
        json: data,
      });
      if (!res.ok) {
        throw new Error("Failed to update activity");
      }
      return res.json();
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["activity"] });
      const previousActivities =
        queryClient.getQueryData<GetActivitiesResponse>(["activity"]);
      queryClient.setQueryData<GetActivitiesResponse>(["activity"], (old) =>
        (old ?? []).map((a) =>
          a.id === variables.id
            ? { ...a, ...variables.data.activity, _isOptimistic: true as const }
            : a,
        ),
      );
      return { previousActivities };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousActivities) {
        queryClient.setQueryData(["activity"], context.previousActivities);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function createUseDeleteActivity(options: UseActivityMutationsOptions) {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-activity"],
    mutationFn: async (id: string) => {
      const res = await apiClient.users.activities[":id"].$delete({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to delete activity");
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["activity"] });
      const previousActivities =
        queryClient.getQueryData<GetActivitiesResponse>(["activity"]);
      queryClient.setQueryData<GetActivitiesResponse>(["activity"], (old) =>
        (old ?? []).filter((a) => a.id !== id),
      );
      return { previousActivities };
    },
    onError: (_err, _id, context) => {
      if (context?.previousActivities) {
        queryClient.setQueryData(["activity"], context.previousActivities);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// Icon upload/delete are handled differently on each platform
// Web uses base64 encoding, mobile might use different approach
// So these are not included in the shared implementation
