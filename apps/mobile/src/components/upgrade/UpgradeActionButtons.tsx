import { RotateCcw } from "lucide-react-native";
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export function UpgradeActionButtons({
  plan,
  isPurchasing,
  isRestoring,
  isLoadingOfferings,
  hasPackage,
  onPurchase,
  onRestore,
}: {
  plan: string;
  isPurchasing: boolean;
  isRestoring: boolean;
  isLoadingOfferings: boolean;
  hasPackage: boolean;
  onPurchase: () => void;
  onRestore: () => void;
}) {
  const isWeb = Platform.OS === "web";
  const isPremium = plan === "premium";
  const disabled =
    isPurchasing || isRestoring || isLoadingOfferings || !hasPackage;

  return (
    <View className="px-4 gap-3">
      {isPremium ? (
        <View className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-4">
          <Text className="text-sm text-amber-800 text-center font-medium">
            現在 Pro プランをご利用中です
          </Text>
        </View>
      ) : isWeb ? (
        <View className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
            アプリ内から購入してください
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          className={`bg-amber-500 dark:bg-amber-600 rounded-xl py-4 items-center ${disabled ? "opacity-50" : ""}`}
          onPress={onPurchase}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Pro プランに登録"
        >
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">
              Pro プランに登録
            </Text>
          )}
        </TouchableOpacity>
      )}

      {!isPremium && !isWeb && (
        <TouchableOpacity
          className="items-center py-3"
          onPress={onRestore}
          disabled={isRestoring}
          accessibilityRole="button"
          accessibilityLabel="購入を復元"
        >
          {isRestoring ? (
            <ActivityIndicator color="#6b7280" size="small" />
          ) : (
            <View className="flex-row items-center">
              <RotateCcw size={14} color="#6b7280" />
              <Text className="ml-1.5 text-sm text-gray-500 dark:text-gray-400">
                購入を復元
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
