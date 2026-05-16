import { useCallback, useEffect, useRef, useState } from "react";

import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UpgradeActionButtons } from "../src/components/upgrade/UpgradeActionButtons";
import {
  FeatureTable,
  HeroSection,
  StatusBar,
  UpgradeHeader,
} from "../src/components/upgrade/UpgradeParts";
import { usePlan } from "../src/hooks/usePlan";
import { useRevenueCat } from "../src/hooks/useRevenueCat";
import { mobileTestIdsExt } from "../src/testing/testIdsExt";

// 遷移元 segment が省略された / 不正な場合は home tab に戻す。
// Slot ベースの root layout だと router.back() が `(tabs)` の initial route
// に戻ってしまうことがあり、Settings から push した場合に Settings を
// 飛び越える事象が出る。caller が from を渡したらそれを replace する。
const DEFAULT_RETURN_PATH = "/(tabs)";
type ReturnPath = "/(tabs)" | "/(tabs)/settings";
const SAFE_RETURN_PATHS: readonly ReturnPath[] = [
  "/(tabs)",
  "/(tabs)/settings",
];

function resolveReturnPath(raw: unknown): ReturnPath {
  if (typeof raw !== "string") return DEFAULT_RETURN_PATH;
  return SAFE_RETURN_PATHS.find((p) => p === raw) ?? DEFAULT_RETURN_PATH;
}

export default function UpgradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const returnPath = resolveReturnPath(params.from);
  const insets = useSafeAreaInsets();
  const plan = usePlan();
  const {
    offerings,
    isLoadingOfferings,
    isPurchasing,
    isRestoring,
    error,
    purchasePackage,
    restorePurchases,
    refreshOfferings,
  } = useRevenueCat();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const backTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    refreshOfferings();
  }, [refreshOfferings]);

  useEffect(() => {
    return () => {
      if (backTimerRef.current !== null) {
        clearTimeout(backTimerRef.current);
        backTimerRef.current = null;
      }
    };
  }, []);

  const scheduleBack = useCallback(
    (delayMs: number) => {
      if (backTimerRef.current !== null) clearTimeout(backTimerRef.current);
      backTimerRef.current = setTimeout(() => {
        backTimerRef.current = null;
        router.replace(returnPath);
      }, delayMs);
    },
    [router, returnPath],
  );

  const currentPackage = offerings?.current?.availablePackages[0] ?? null;

  const priceLabel =
    currentPackage?.product.priceString ?? (isLoadingOfferings ? "..." : "--");

  const handleBack = useCallback(() => {
    router.replace(returnPath);
  }, [router, returnPath]);

  const handlePurchase = async () => {
    if (!currentPackage) return;
    const success = await purchasePackage(currentPackage);
    if (success) {
      setSuccessMessage("Pro プランへのアップグレードが完了しました");
      scheduleBack(1500);
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      setSuccessMessage("購入を復元しました");
      scheduleBack(1500);
    }
  };

  return (
    <View
      className="flex-1 bg-white dark:bg-gray-800"
      style={{ paddingTop: insets.top }}
      testID={mobileTestIdsExt.upgrade.page}
    >
      <UpgradeHeader onBack={handleBack} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <HeroSection priceLabel={priceLabel} />
        <FeatureTable />

        {successMessage && (
          <StatusBar message={successMessage} variant="success" />
        )}
        {error && <StatusBar message={error} variant="error" />}

        <UpgradeActionButtons
          plan={plan}
          isPurchasing={isPurchasing}
          isRestoring={isRestoring}
          isLoadingOfferings={isLoadingOfferings}
          hasPackage={!!currentPackage}
          onPurchase={handlePurchase}
          onRestore={handleRestore}
        />
      </ScrollView>
    </View>
  );
}
