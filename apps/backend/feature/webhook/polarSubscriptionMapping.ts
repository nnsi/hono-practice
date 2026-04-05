import type { SubscriptionStatus } from "@packages/domain/subscription/subscriptionSchema";

export const POLAR_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "active",
  past_due: "active",
  trialing: "trial",
  incomplete: "paused",
  canceled: "cancelled",
  unpaid: "expired",
};

export function resolvePlan(status: SubscriptionStatus): "free" | "premium" {
  return status === "expired" || status === "cancelled" ? "free" : "premium";
}
