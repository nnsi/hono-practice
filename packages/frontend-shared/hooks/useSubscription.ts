import type { SubscriptionResponse } from "@packages/types/response";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";

export type UseSubscriptionOptions = {
  fetchSubscription: () => Promise<SubscriptionResponse>;
};

/**
 * サブスクリプション情報を取得する共通フック
 */
export function createUseSubscription(
  options: UseSubscriptionOptions,
): UseQueryResult<SubscriptionResponse> {
  const { fetchSubscription } = options;

  // biome-ignore lint/correctness/useHookAtTopLevel: createUseXxxファクトリはアプリ側のカスタムフック本体から直接呼ばれる（プロジェクト規約）
  return useQuery<SubscriptionResponse>({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
    staleTime: 1000 * 60 * 5, // 5分間はキャッシュを利用
  });
}
