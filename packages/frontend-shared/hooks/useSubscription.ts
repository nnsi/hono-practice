import { type UseQueryResult, useQuery } from "@tanstack/react-query";

import type { SubscriptionResponse } from "@dtos/response";

import type { AppType } from "@backend/app";

export type UseSubscriptionOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

/**
 * サブスクリプション情報を取得する共通フック
 */
export function createUseSubscription(
  options: UseSubscriptionOptions,
): UseQueryResult<SubscriptionResponse> {
  const { apiClient } = options;

  return useQuery<SubscriptionResponse>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await apiClient.users.subscription.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch subscription");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5分間はキャッシュを利用
  });
}
