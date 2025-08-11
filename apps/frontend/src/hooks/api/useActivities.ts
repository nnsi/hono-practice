import { apiClient } from "@frontend/utils";
import { resizeImage } from "@frontend/utils/imageResizer";
import { tokenStore } from "@frontend/utils/tokenStore";
import { createUseActivities } from "@packages/frontend-shared/hooks";
import {
  createUseDeleteActivityIcon,
  createUseUploadActivityIcon,
} from "@packages/frontend-shared/hooks/useActivityIcon";
import {
  createUseCreateActivity,
  createUseDeleteActivity,
  createUseUpdateActivity,
} from "@packages/frontend-shared/hooks/useActivityMutations";
import { getWebApiUrl } from "@packages/frontend-shared/utils/apiUrl";

import type { GetActivitiesResponse } from "@dtos/response";

/**
 * 全アクティビティ一覧を取得するフック
 *
 * 他のコンポーネントで重複していた取得処理を共通化するために作成。
 */
export function useActivities() {
  const useActivitiesBase = createUseActivities({ apiClient });
  const result = useActivitiesBase();

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
 * @deprecated Use useCreateActivity from '@frontend/hooks/sync' instead
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
 */
export function useUploadActivityIcon() {
  // Web用のリサイザー実装
  const webResizer = {
    resizeImage: (file: File, maxWidth: number, maxHeight: number) =>
      resizeImage(file, maxWidth, maxHeight),
  };

  // API設定
  const apiConfig = {
    getApiUrl: () =>
      getWebApiUrl({
        isDevelopment: import.meta.env.MODE === "development",
        apiUrl: import.meta.env.VITE_API_URL,
        apiPort: import.meta.env.VITE_API_PORT || "3456",
      }),
    getToken: () => tokenStore.getToken(),
  };

  return createUseUploadActivityIcon(webResizer, apiConfig);
}

/**
 * Activityアイコン削除用のフック
 */
export function useDeleteActivityIcon() {
  // API設定
  const apiConfig = {
    getApiUrl: () =>
      getWebApiUrl({
        isDevelopment: import.meta.env.MODE === "development",
        apiUrl: import.meta.env.VITE_API_URL,
        apiPort: import.meta.env.VITE_API_PORT || "3456",
      }),
    getToken: () => tokenStore.getToken(),
  };

  return createUseDeleteActivityIcon(apiConfig);
}
