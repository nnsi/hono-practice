import { useCallback, useEffect, useRef, useState } from "react";

import { Platform } from "react-native";
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import Purchases from "react-native-purchases";

import { useAuthContext } from "../contexts/AuthContext";
import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";
import { initRevenueCat } from "../lib/revenueCat";
import { apiGetMe } from "../utils/authApi";

type RevenueCatState = {
  offerings: PurchasesOfferings | null;
  isLoadingOfferings: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  error: string | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshOfferings: () => Promise<void>;
};

/**
 * Pure function: evaluates whether the entitlement state changed and calls
 * refreshPlanFromBackend when it did. Returns true if a refresh was triggered.
 *
 * Extracted for testability — the useEffect closure delegates to this.
 */
export function handleCustomerInfoUpdate(
  info: CustomerInfo,
  lastActiveRef: { current: boolean | null },
): boolean {
  const isPremiumActive = info.entitlements.active.premium !== undefined;
  if (lastActiveRef.current === isPremiumActive) return false;
  const prevActive = lastActiveRef.current;
  lastActiveRef.current = isPremiumActive;
  refreshPlanFromBackend().catch(() => {
    // restore prev so the next identical event can re-trigger a retry
    lastActiveRef.current = prevActive;
  });
  return true;
}

export async function refreshPlanFromBackend(): Promise<void> {
  const user = await apiGetMe();
  const db = await getDatabase();
  await db.runAsync("UPDATE auth_state SET plan = ? WHERE id = 'current'", [
    user.plan ?? "free",
  ]);
  // usePlan は dbEvents("auth_state") を購読しているので、SubscriptionSection /
  // UpgradeScreen が同一画面に留まったままでも再レンダリングされる。
  dbEvents.emit("auth_state");
}

export type PurchaseResult = { ok: boolean; userCancelled: boolean };

export async function executePurchase(
  pkg: PurchasesPackage,
): Promise<PurchaseResult> {
  try {
    await Purchases.purchasePackage(pkg);
    await refreshPlanFromBackend();
    return { ok: true, userCancelled: false };
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean };
    return { ok: false, userCancelled: err.userCancelled === true };
  }
}

export async function executeRestore(): Promise<boolean> {
  try {
    await Purchases.restorePurchases();
    await refreshPlanFromBackend();
    return true;
  } catch {
    return false;
  }
}

export function useRevenueCat(): RevenueCatState {
  const { userId } = useAuthContext();
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const lastEntitlementActiveRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!userId || Platform.OS === "web" || initializedRef.current) return;
    initializedRef.current = true;
    initRevenueCat(userId).catch(() => {
      // RevenueCat init failure is non-fatal
    });

    const handleCustomerInfo = (info: CustomerInfo) => {
      handleCustomerInfoUpdate(info, lastEntitlementActiveRef);
    };

    Purchases.addCustomerInfoUpdateListener(handleCustomerInfo);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(handleCustomerInfo);
    };
  }, [userId]);

  const refreshOfferings = useCallback(async () => {
    if (Platform.OS === "web") return;
    setIsLoadingOfferings(true);
    setError(null);
    try {
      const result = await Purchases.getOfferings();
      setOfferings(result);
    } catch {
      setError("プランの取得に失敗しました");
    } finally {
      setIsLoadingOfferings(false);
    }
  }, []);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      setIsPurchasing(true);
      setError(null);
      try {
        const result = await executePurchase(pkg);
        if (!result.ok && !result.userCancelled) {
          setError("購入に失敗しました。もう一度お試しください");
        }
        return result.ok;
      } finally {
        setIsPurchasing(false);
      }
    },
    [],
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setIsRestoring(true);
    setError(null);
    try {
      const ok = await executeRestore();
      if (!ok) setError("購入の復元に失敗しました");
      return ok;
    } finally {
      setIsRestoring(false);
    }
  }, []);

  return {
    offerings,
    isLoadingOfferings,
    isPurchasing,
    isRestoring,
    error,
    purchasePackage,
    restorePurchases,
    refreshOfferings,
  };
}
