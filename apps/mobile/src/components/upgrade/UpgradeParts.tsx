import { Check, ChevronLeft, Crown, X } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

const FEATURES: { label: string; free: boolean; pro: boolean }[] = [
  { label: "活動の記録・管理", free: true, pro: true },
  { label: "目標設定・トラッキング", free: true, pro: true },
  { label: "タスク管理", free: true, pro: true },
  { label: "統計・グラフ", free: true, pro: true },
  { label: "音声で記録", free: false, pro: true },
  { label: "API Key発行", free: false, pro: true },
  { label: "Apple Watch対応", free: false, pro: true },
  { label: "ウィジェット無制限", free: false, pro: true },
];

function FeatureIcon({ available }: { available: boolean }) {
  return available ? (
    <Check size={16} color="#16a34a" />
  ) : (
    <X size={16} color="#d1d5db" />
  );
}

export function UpgradeHeader({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <TouchableOpacity
        onPress={onBack}
        className="mr-3 p-1"
        accessibilityRole="button"
        accessibilityLabel="戻る"
      >
        <ChevronLeft size={24} color="#374151" />
      </TouchableOpacity>
      <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
        Pro プラン
      </Text>
    </View>
  );
}

export function HeroSection({ priceLabel }: { priceLabel: string }) {
  return (
    <View className="items-center mt-8 mb-6 px-4">
      <View className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full items-center justify-center mb-4">
        <Crown size={32} color="#f59e0b" />
      </View>
      <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Actiko Pro
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
        すべての機能をアンロック
      </Text>
      <Text className="text-3xl font-bold text-amber-600 dark:text-amber-400">
        {priceLabel}
        <Text className="text-base font-normal text-gray-500 dark:text-gray-400">
          {" "}
          / 月
        </Text>
      </Text>
    </View>
  );
}

export function FeatureTable() {
  return (
    <View className="mx-4 mb-6 bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <View className="flex-row px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
        <Text className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          機能
        </Text>
        <Text className="w-14 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
          Free
        </Text>
        <Text className="w-14 text-center text-sm font-medium text-amber-700 dark:text-amber-400">
          Pro
        </Text>
      </View>
      {FEATURES.map((f) => (
        <View
          key={f.label}
          className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800"
        >
          <Text className="flex-1 text-sm text-gray-800 dark:text-gray-200">
            {f.label}
          </Text>
          <View className="w-14 items-center">
            <FeatureIcon available={f.free} />
          </View>
          <View className="w-14 items-center">
            <FeatureIcon available={f.pro} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function StatusBar({
  message,
  variant,
}: {
  message: string;
  variant: "success" | "error";
}) {
  const isSuccess = variant === "success";
  return (
    <View
      className={`mx-4 mb-4 border rounded-xl p-4 ${
        isSuccess
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
      }`}
    >
      <Text
        className={`text-sm text-center ${
          isSuccess
            ? "text-green-700 dark:text-green-400 font-medium"
            : "text-red-700 dark:text-red-400"
        }`}
      >
        {message}
      </Text>
    </View>
  );
}
