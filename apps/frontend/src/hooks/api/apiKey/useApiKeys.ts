import { apiClient } from "@frontend/utils";
import {
  createUseApiKeys,
  createUseCreateApiKey,
  createUseDeleteApiKey,
} from "@packages/frontend-shared/hooks";

/**
 * APIキー一覧を取得するフック
 */
export function useApiKeys() {
  return createUseApiKeys({ apiClient });
}

/**
 * APIキー作成用のフック
 */
export function useCreateApiKey() {
  return createUseCreateApiKey({ apiClient });
}

/**
 * APIキー削除用のフック
 */
export function useDeleteApiKey() {
  return createUseDeleteApiKey({ apiClient });
}
