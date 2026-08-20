import { createUseSubscription } from "@packages/frontend-shared/hooks/useSubscription";

import { apiClient } from "../api/apiClient";

export const subscriptionQueryKey = ["subscription"];

export async function fetchSubscription(signal?: AbortSignal) {
  const res = signal
    ? await apiClient.users.subscription.$get(undefined, { init: { signal } })
    : await apiClient.users.subscription.$get();

  if (!res.ok) {
    throw new Error("Failed to fetch subscription");
  }

  return res.json();
}

export function subscriptionQueryOptions() {
  return {
    queryKey: subscriptionQueryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchSubscription(signal),
    staleTime: 1000 * 60 * 5,
  };
}

export function useSubscription() {
  return createUseSubscription({
    fetchSubscription: () => fetchSubscription(),
  });
}
