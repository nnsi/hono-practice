import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * 画像リサイザーのインターフェース
 * プラットフォーム固有の実装を注入可能にする
 */
export interface ImageResizer {
  resizeImage(
    input: File | Blob,
    maxWidth: number,
    maxHeight: number,
  ): Promise<{ base64: string; mimeType: string }>;
}

/**
 * API設定のインターフェース
 */
export interface ApiConfig {
  getApiUrl: () => string;
  getToken: () => string | null;
}

/**
 * アクティビティアイコンアップロード用の共通フック
 */
export function createUseUploadActivityIcon(
  resizer: ImageResizer,
  apiConfig: ApiConfig,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File | Blob }) => {
      // Resize image to 256x256 max and convert to base64
      const { base64, mimeType } = await resizer.resizeImage(file, 256, 256);

      const apiUrl = apiConfig.getApiUrl();
      const token = apiConfig.getToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}users/activities/${id}/icon`, {
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
 * アクティビティアイコン削除用の共通フック
 */
export function createUseDeleteActivityIcon(apiConfig: ApiConfig) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const apiUrl = apiConfig.getApiUrl();
      const token = apiConfig.getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}users/activities/${id}/icon`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to delete icon");
      }

      if (response.status === 204) {
        return null;
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
