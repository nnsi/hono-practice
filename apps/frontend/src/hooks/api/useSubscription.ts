import { apiClient } from "@frontend/utils";
import { createUseSubscription } from "@packages/frontend-shared/hooks";

/**
 * サブスクリプション情報を取得するフック
 */
export const useSubscription = () => {
  return createUseSubscription({ apiClient });
};
