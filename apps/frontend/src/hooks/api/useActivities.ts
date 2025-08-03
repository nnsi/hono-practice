import { apiClient } from "@frontend/utils";
import { resizeImage } from "@frontend/utils/imageResizer";
import { tokenStore } from "@frontend/utils/tokenStore";
import { createUseActivities } from "@packages/frontend-shared/hooks";
import {
  createUseCreateActivity,
  createUseDeleteActivity,
  createUseUpdateActivity,
} from "@packages/frontend-shared/hooks/useActivityMutations";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
 * Activity作成用のフック
 */
export function useCreateActivity() {
  return createUseCreateActivity({ apiClient });
}

/**
 * Activity更新用のフック
 */
export function useUpdateActivity() {
  return createUseUpdateActivity({ apiClient });
}

/**
 * Activity削除用のフック
 */
export function useDeleteActivity() {
  return createUseDeleteActivity({ apiClient });
}

/**
 * Activityアイコンアップロード用のフック
 * Note: This needs special handling for image resizing, so it's not shared yet
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
 * Note: This uses raw fetch for now, but could be migrated to shared implementation
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
