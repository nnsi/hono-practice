import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Platform } from "react-native";
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import Purchases from "react-native-purchases";

import {
  reconcilePlanFromBackend,
  refreshPlanFromBackend,
} from "../auth/planReconciliation";
import { useAuthContext } from "../contexts/AuthContext";
import { initRevenueCat } from "../lib/revenueCat";

export { reconcilePlanFromBackend, refreshPlanFromBackend };

type RevenueCatState = {
  offerings: PurchasesOfferings | null;
  isLoadingOfferings: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  purchasePending: boolean;
  pendingMessage: string | null;
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
  reconcilePlanFromBackend(isPremiumActive ? "premium" : "free").then((ok) => {
    if (ok) return;
    // restore prev so the next identical event can re-trigger a retry
    lastActiveRef.current = prevActive;
  });
  return true;
}

export type PurchaseResult = {
  ok: boolean;
  userCancelled: boolean;
  pending?: boolean;
};

export async function executePurchase(
  pkg: PurchasesPackage,
): Promise<PurchaseResult> {
  try {
    await Purchases.purchasePackage(pkg);
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean };
    return { ok: false, userCancelled: err.userCancelled === true };
  }
  // The store has accepted payment. A delayed webhook or network failure must
  // never invite the customer to pay again. Backend state still gates access.
  const reconciled = await reconcilePlanFromBackend("premium").catch(
    () => false,
  );
  return reconciled
    ? { ok: true, userCancelled: false }
    : { ok: false, userCancelled: false, pending: true };
}

export async function executeRestore(): Promise<{
  ok: boolean;
  pending?: boolean;
}> {
  try {
    const info = await Purchases.restorePurchases();
    const expectedPlan = info.entitlements.active.premium ? "premium" : "free";
    const ok = await reconcilePlanFromBackend(expectedPlan);
    return { ok, pending: !ok && expectedPlan === "premium" };
  } catch {
    return { ok: false };
  }
}

export function useRevenueCat(): RevenueCatState {
  const { userId } = useAuthContext();
  const { t } = useTranslation("settings");
  const [purchasePending, setPurchasePending] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const lastEntitlementActiveRef = useRef<boolean | null>(null);

  useEffect(() => {
    setPurchasePending(false);
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
      // userId が変わって effect が再実行される際に initRevenueCat / リスナー登録が
      // 再度走るよう、次回 mount 判定用の ref をリセットする（BUG-9）。
      initializedRef.current = false;
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
        setPurchasePending(result.pending === true);
        if (!result.ok && !result.userCancelled && !result.pending) {
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
      const result = await executeRestore();
      if (result.ok) setPurchasePending(false);
      if (result.pending) setPurchasePending(true);
      if (!result.ok && !result.pending) setError("購入の復元に失敗しました");
      return result.ok;
    } finally {
      setIsRestoring(false);
    }
  }, []);

  return {
    offerings,
    isLoadingOfferings,
    isPurchasing,
    isRestoring,
    purchasePending,
    pendingMessage: purchasePending ? t("purchasePending") : null,
    error,
    purchasePackage,
    restorePurchases,
    refreshOfferings,
  };
}
