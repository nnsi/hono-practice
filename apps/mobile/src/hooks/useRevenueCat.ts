import { useCallback, useEffect, useRef, useState } from "react";

import { Platform } from "react-native";
import type {
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import Purchases from "react-native-purchases";

import { useAuthContext } from "../../app/_layout";
import { getDatabase } from "../db/database";
import { initRevenueCat } from "../lib/revenueCat";
import { customFetch, getApiUrl } from "../utils/apiClient";

const API_URL = getApiUrl();

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

async function refreshPlanFromBackend(): Promise<void> {
  const res = await customFetch(`${API_URL}/users/subscription`);
  if (!res.ok) return;
  const data = await res.json();
  const db = await getDatabase();
  await db.runAsync("UPDATE auth_state SET plan = ? WHERE id = 'current'", [
    data.plan ?? "free",
  ]);
}

export function useRevenueCat(): RevenueCatState {
  const { userId } = useAuthContext();
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!userId || Platform.OS === "web" || initializedRef.current) return;
    initializedRef.current = true;
    initRevenueCat(userId).catch(() => {
      // RevenueCat init failure is non-fatal
    });
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
        await Purchases.purchasePackage(pkg);
        await refreshPlanFromBackend();
        return true;
      } catch (e: unknown) {
        const err = e as { userCancelled?: boolean };
        if (err.userCancelled) {
          // User cancelled — not an error
          return false;
        }
        setError("購入に失敗しました。もう一度お試しください");
        return false;
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
      await Purchases.restorePurchases();
      await refreshPlanFromBackend();
      return true;
    } catch {
      setError("購入の復元に失敗しました");
      return false;
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
