import { useState } from "react";

import type { SubscriptionPlan } from "@packages/domain/subscription/subscriptionSchema";
import { type PollSleep, pollWithExponentialBackoff } from "@packages/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchSubscription,
  subscriptionQueryOptions,
} from "../../hooks/useSubscription";

type CheckoutReconcileStatus = "idle" | "polling" | "complete" | "timeout";

type ReconcileOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  sleep?: PollSleep;
  signal?: AbortSignal;
};

export async function pollForCheckoutEntitlement(
  fetchPlan: () => Promise<SubscriptionPlan | undefined>,
  options: ReconcileOptions = {},
): Promise<boolean> {
  const result = await pollWithExponentialBackoff({
    operation: fetchPlan,
    accept: (plan) => plan === "premium",
    maxAttempts: options.maxAttempts,
    initialDelayMs: options.initialDelayMs,
    sleep: options.sleep,
    signal: options.signal,
  });
  return result.matched;
}

export function hasCheckoutSuccessMarker(): boolean {
  return (
    new URL(window.location.href).searchParams.get("checkout") === "success"
  );
}

export function consumeCheckoutSuccessMarker(): boolean {
  const url = new URL(window.location.href);
  if (url.searchParams.get("checkout") !== "success") return false;
  // Consume the callback marker once so reload/back navigation cannot start
  // duplicate polling loops. Preserve unrelated query parameters.
  url.searchParams.delete("checkout");
  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
  return true;
}

export function useCheckoutReconciliation(
  options: ReconcileOptions = {},
): CheckoutReconcileStatus {
  const queryClient = useQueryClient();
  const [shouldReconcile] = useState(hasCheckoutSuccessMarker);
  const reconciliation = useQuery({
    queryKey: ["subscription", "checkout-reconciliation"],
    enabled: shouldReconcile,
    retry: false,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      consumeCheckoutSuccessMarker();
      return pollForCheckoutEntitlement(
        async () => {
          const subscription = await queryClient.fetchQuery({
            ...subscriptionQueryOptions(),
            staleTime: 0,
            queryFn: () => fetchSubscription(signal),
          });
          return subscription.plan === "premium" || subscription.plan === "free"
            ? subscription.plan
            : undefined;
        },
        {
          ...options,
          signal,
        },
      );
    },
  });

  if (!shouldReconcile) return "idle";
  if (reconciliation.isPending || reconciliation.isFetching) return "polling";
  return reconciliation.data ? "complete" : "timeout";
}
