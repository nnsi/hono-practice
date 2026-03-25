import type { SubscriptionPlan } from "@packages/domain/subscription/subscriptionSchema";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/schema";

export function usePlan(): SubscriptionPlan {
  const authState = useLiveQuery(() => db.authState.get("current"));
  return authState?.plan === "premium" ? "premium" : "free";
}
