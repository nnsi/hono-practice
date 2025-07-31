import { createUseSubscription } from "@packages/frontend-shared/hooks";

import { apiClient } from "../utils/apiClient";

/**
 * サブスクリプション情報を取得するフック
 */
export const useSubscription = () => {
  return createUseSubscription({ apiClient });
};
