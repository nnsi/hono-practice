import { useQuery } from "@tanstack/react-query";

import type { SubscriptionResponse } from "@dtos/response";

import { apiClient } from "../utils/apiClient";

export const useSubscription = () => {
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
};
