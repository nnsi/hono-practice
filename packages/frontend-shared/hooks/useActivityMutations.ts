import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  CreateActivityRequest,
  UpdateActivityRequest,
} from "@dtos/request";

import type { AppType } from "@backend/app";

export type UseActivityMutationsOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

export function createUseCreateActivity(options: UseActivityMutationsOptions) {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateActivityRequest) => {
      const res = await apiClient.users.activities.$post({
        json: data,
      });
      if (!res.ok) {
        throw new Error("Failed to create activity");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function createUseUpdateActivity(options: UseActivityMutationsOptions) {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function createUseDeleteActivity(options: UseActivityMutationsOptions) {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.users.activities[":id"].$delete({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to delete activity");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// Icon upload/delete are handled differently on each platform
// Web uses base64 encoding, mobile might use different approach
// So these are not included in the shared implementation
