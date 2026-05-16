import { useCallback, useEffect, useState } from "react";

import type { SubscriptionPlan } from "@packages/domain/subscription/subscriptionSchema";
import { useFocusEffect } from "expo-router";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";

export function usePlan(): SubscriptionPlan {
  const [plan, setPlan] = useState<SubscriptionPlan>("free");

  const fetchPlan = useCallback(() => {
    getDatabase().then((db) =>
      db
        .getFirstAsync<{ plan: string | null }>(
          "SELECT plan FROM auth_state WHERE id = 'current'",
        )
        .then((row) => {
          setPlan(row?.plan === "premium" ? "premium" : "free");
        }),
    );
  }, []);

  useEffect(() => {
    fetchPlan();
    // refreshPlanFromBackend や手動の dev トグル等で auth_state.plan が更新された
    // ときに、画面遷移なしでも UI に反映する。
    return dbEvents.subscribe("auth_state", fetchPlan);
  }, [fetchPlan]);

  useFocusEffect(fetchPlan);

  return plan;
}
