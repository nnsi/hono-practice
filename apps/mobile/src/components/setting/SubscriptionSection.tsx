import { useCallback, useEffect, useState } from "react";

import { useRouter } from "expo-router";
import { Crown, RotateCcw } from "lucide-react-native";
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { usePlan } from "../../hooks/usePlan";
import { useRevenueCat } from "../../hooks/useRevenueCat";
import { customFetch, getApiUrl } from "../../utils/apiClient";
import { Section, type ShadowStyle } from "./SettingsParts";

const API_URL = getApiUrl();

type SubscriptionInfo = {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
};

export function SubscriptionSection({ shadow }: { shadow: ShadowStyle }) {
  const router = useRouter();
  const plan = usePlan();
  const { isRestoring, restorePurchases, error } = useRevenueCat();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);

  const fetchInfo = useCallback(async () => {
    try {
      const res = await customFetch(`${API_URL}/users/subscription`);
      if (res.ok) setInfo(await res.json());
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const isPremium = plan === "premium";
  const periodEnd = info?.currentPeriodEnd
    ? new Date(info.currentPeriodEnd).toLocaleDateString("ja-JP")
    : null;

  return (
    <Section icon={Crown} label="プラン" shadow={shadow}>
      <View className="px-4 py-3">
        <View className="flex-row items-center">
          <View
            className={`px-2.5 py-1 rounded-full ${
              isPremium ? "bg-amber-100" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                isPremium ? "text-amber-700" : "text-gray-600"
              }`}
            >
              {isPremium ? "Pro" : "Free"}
            </Text>
          </View>
          {isPremium && periodEnd && (
            <Text className="ml-3 text-xs text-gray-500">
              次回更新: {periodEnd}
            </Text>
          )}
        </View>
      </View>

      {!isPremium && (
        <>
          <View className="border-t border-gray-100 mx-4" />
          <TouchableOpacity
            className="flex-row items-center px-4 py-3"
            onPress={() => router.push("/upgrade")}
          >
            <Crown size={18} color="#f59e0b" />
            <Text className="ml-3 text-base text-amber-600 font-medium">
              Pro プランにアップグレード
            </Text>
          </TouchableOpacity>
        </>
      )}

      {Platform.OS !== "web" && (
        <>
          <View className="border-t border-gray-100 mx-4" />
          <TouchableOpacity
            className="flex-row items-center px-4 py-3"
            onPress={() => restorePurchases()}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color="#6b7280" />
            ) : (
              <>
                <RotateCcw size={18} color="#6b7280" />
                <Text className="ml-3 text-base text-gray-600">購入を復元</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      {error && (
        <View className="mx-4 mb-3">
          <Text className="text-xs text-red-500">{error}</Text>
        </View>
      )}
    </Section>
  );
}
