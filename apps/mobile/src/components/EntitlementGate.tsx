import type { ReactNode } from "react";

import type { SubscriptionPlan } from "@packages/domain/subscription/subscriptionSchema";
import { useRouter } from "expo-router";
import { Crown } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { usePlan } from "../hooks/usePlan";

type EntitlementGateProps = {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
};

function DefaultFallback({ feature }: { feature: string }) {
  const router = useRouter();

  return (
    <View className="mx-4 my-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-4">
      <View className="flex-row items-center mb-2">
        <Crown size={16} color="#f59e0b" />
        <Text className="ml-2 text-sm font-medium text-amber-800">
          Pro 機能
        </Text>
      </View>
      <Text className="text-sm text-amber-700 dark:text-amber-400 mb-3">
        「{feature}」は Pro プランでご利用いただけます。
      </Text>
      <TouchableOpacity
        className="bg-amber-50 dark:bg-amber-900/200 rounded-lg py-2.5 items-center"
        onPress={() => router.push("/upgrade")}
        accessibilityRole="button"
        accessibilityLabel="Pro プランを見る"
      >
        <Text className="text-white font-medium text-sm">Pro プランを見る</Text>
      </TouchableOpacity>
    </View>
  );
}

function isPremium(plan: SubscriptionPlan): boolean {
  return plan === "premium";
}

export function EntitlementGate({
  feature,
  children,
  fallback,
}: EntitlementGateProps) {
  const plan = usePlan();

  if (isPremium(plan)) {
    return <>{children}</>;
  }

  return <>{fallback ?? <DefaultFallback feature={feature} />}</>;
}
