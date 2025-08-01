import { apiClient } from "@frontend/utils";
import { resizeImage } from "@frontend/utils/imageResizer";
import { tokenStore } from "@frontend/utils/tokenStore";
import { createUseActivities } from "@packages/frontend-shared/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateActivityRequest } from "@dtos/request/UpdateActivityRequest";
import type { GetActivitiesResponse } from "@dtos/response";

/**
 * 全アクティビティ一覧を取得するフック
 *
 * 他のコンポーネントで重複していた取得処理を共通化するために作成。
 */
export function useActivities() {
  const result = createUseActivities({ apiClient });

  // 既存のコードとの互換性を保つため、TanStack Queryの形式に合わせて返す
  return {
    data:
      result.isLoading || result.error
        ? undefined
        : (result.activities as GetActivitiesResponse),
    error: result.error,
    isLoading: result.isLoading,
    isError: !!result.error,
    isSuccess: !result.isLoading && !result.error,
    refetch: result.refetch,
  };
}

/**
 * Activity更新用のフック
 */
export function useUpdateActivity() {
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

/**
 * Activity削除用のフック
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.users.activities[":id"].$delete({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to delete activity");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

/**
 * Activityアイコンアップロード用のフック
 */
export function useUploadActivityIcon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      // Resize image to 256x256 max and convert to base64
      const { base64, mimeType } = await resizeImage(file, 256, 256);

      const API_URL =
        import.meta.env.MODE === "development"
          ? import.meta.env.VITE_API_URL ||
            `http://${document.domain}:${import.meta.env.VITE_API_PORT || "3456"}/`
          : import.meta.env.VITE_API_URL;

      const token = tokenStore.getToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}users/activities/${id}/icon`, {
        method: "POST",
        body: JSON.stringify({ base64, mimeType }),
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to upload icon");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

/**
 * Activityアイコン削除用のフック
 */
export function useDeleteActivityIcon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const API_URL =
        import.meta.env.MODE === "development"
          ? import.meta.env.VITE_API_URL ||
            `http://${document.domain}:${import.meta.env.VITE_API_PORT || "3456"}/`
          : import.meta.env.VITE_API_URL;

      const token = tokenStore.getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}users/activities/${id}/icon`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to delete icon");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

/**
 * Activity作成用のフック
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      quantityUnit: string;
      emoji: string;
      description: string;
      showCombinedStats: boolean;
    }) => {
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
