import { useEffect, useState } from "react";

import { useRouter } from "expo-router";
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

export default function UpgradeScreen() {
  const router = useRouter();
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

  useEffect(() => {
    refreshOfferings();
  }, [refreshOfferings]);

  const currentPackage = offerings?.current?.availablePackages[0] ?? null;

  const priceLabel =
    currentPackage?.product.priceString ?? (isLoadingOfferings ? "..." : "--");

  const handlePurchase = async () => {
    if (!currentPackage) return;
    const success = await purchasePackage(currentPackage);
    if (success) {
      setSuccessMessage("Pro プランへのアップグレードが完了しました");
      setTimeout(() => router.back(), 1500);
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      setSuccessMessage("購入を復元しました");
      setTimeout(() => router.back(), 1500);
    }
  };

  return (
    <View
      className="flex-1 bg-white dark:bg-gray-800"
      style={{ paddingTop: insets.top }}
    >
      <UpgradeHeader onBack={() => router.back()} />
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
