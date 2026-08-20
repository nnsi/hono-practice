import type { AuthStateRepository } from "@packages/auth-client";
import type { SubscriptionPlan } from "@packages/domain/subscription/subscriptionSchema";
import { type PollSleep, pollWithExponentialBackoff } from "@packages/utils";

import { reloadWidgetTimelines } from "../lib/widgetTimeline";
import { apiGetMe } from "../utils/authApi";
import { createMobileAuthStateRepository } from "./mobileAuthStateRepository";

type PlanPersistence = Pick<AuthStateRepository, "setPlan">;

type PlanPersistenceOptions = {
  authStateRepository?: PlanPersistence;
  notifyWidgetTimelines?: () => void;
};

type ReconcileOptions = PlanPersistenceOptions & {
  maxAttempts?: number;
  initialDelayMs?: number;
  sleep?: PollSleep;
};

export async function persistPlan(
  plan: SubscriptionPlan,
  options: PlanPersistenceOptions = {},
): Promise<void> {
  const repository =
    options.authStateRepository ?? createMobileAuthStateRepository();
  await repository.setPlan(plan);
  (options.notifyWidgetTimelines ?? reloadWidgetTimelines)();
}

/** Fetches and persists the backend's effective entitlement. */
export async function refreshPlanFromBackend(
  options: PlanPersistenceOptions = {},
): Promise<SubscriptionPlan> {
  const user = await apiGetMe();
  const plan: SubscriptionPlan = user.plan ?? "free";
  await persistPlan(plan, options);
  return plan;
}

/**
 * Polls through a webhook propagation delay. A successful response containing
 * the old plan is deliberately retried until the expected effective plan is
 * observed or the bounded backoff is exhausted.
 */
export async function reconcilePlanFromBackend(
  expectedPlan: SubscriptionPlan,
  options: ReconcileOptions = {},
): Promise<boolean> {
  const result = await pollWithExponentialBackoff({
    operation: () => refreshPlanFromBackend(options),
    accept: (plan) => plan === expectedPlan,
    maxAttempts: options.maxAttempts,
    initialDelayMs: options.initialDelayMs,
    sleep: options.sleep,
  });
  return result.matched;
}
