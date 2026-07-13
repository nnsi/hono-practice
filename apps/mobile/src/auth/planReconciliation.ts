import type { SubscriptionPlan } from "@packages/domain/subscription/subscriptionSchema";
import {
  type PollSleep,
  pollWithExponentialBackoff,
} from "@packages/sync-engine";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";
import { reloadWidgetTimelines } from "../lib/widgetTimeline";
import { apiGetMe } from "../utils/authApi";

type ReconcileOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  sleep?: PollSleep;
};

export async function persistPlan(plan: SubscriptionPlan): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE auth_state SET plan = ? WHERE id = 'current'", [
    plan,
  ]);
  dbEvents.emit("auth_state");
  reloadWidgetTimelines();
}

/** Fetches and persists the backend's effective entitlement. */
export async function refreshPlanFromBackend(): Promise<SubscriptionPlan> {
  const user = await apiGetMe();
  const plan: SubscriptionPlan = user.plan ?? "free";
  await persistPlan(plan);
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
    operation: refreshPlanFromBackend,
    accept: (plan) => plan === expectedPlan,
    maxAttempts: options.maxAttempts,
    initialDelayMs: options.initialDelayMs,
    sleep: options.sleep,
  });
  return result.matched;
}
