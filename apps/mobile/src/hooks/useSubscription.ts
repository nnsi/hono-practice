import { createUseSubscription } from "@packages/frontend-shared/hooks/useSubscription";

import { apiClient } from "../utils/apiClient";

export function useSubscription() {
  return createUseSubscription({
    fetchSubscription: async () => {
      const res = await apiClient.users.subscription.$get();

      if (!res.ok) {
        throw new Error("Failed to fetch subscription");
      }

      return res.json();
    },
  });
}
