import { Check, ChevronLeft, Crown, RotateCcw, X } from "lucide-react-native";
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
    <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
      <TouchableOpacity onPress={onBack} className="mr-3 p-1">
        <ChevronLeft size={24} color="#374151" />
      </TouchableOpacity>
      <Text className="text-lg font-bold text-gray-900">Pro プラン</Text>
    </View>
  );
}

export function HeroSection({ priceLabel }: { priceLabel: string }) {
  return (
    <View className="items-center mt-8 mb-6 px-4">
      <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-4">
        <Crown size={32} color="#f59e0b" />
      </View>
      <Text className="text-2xl font-bold text-gray-900 mb-2">Actiko Pro</Text>
      <Text className="text-sm text-gray-500 text-center mb-4">
        すべての機能をアンロック
      </Text>
      <Text className="text-3xl font-bold text-amber-600">
        {priceLabel}
        <Text className="text-base font-normal text-gray-500"> / 月</Text>
      </Text>
    </View>
  );
}

export function FeatureTable() {
  return (
    <View className="mx-4 mb-6 bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
      <View className="flex-row px-4 py-3 border-b border-gray-200 bg-gray-100">
        <Text className="flex-1 text-sm font-medium text-gray-700">機能</Text>
        <Text className="w-14 text-center text-sm font-medium text-gray-700">
          Free
        </Text>
        <Text className="w-14 text-center text-sm font-medium text-amber-700">
          Pro
        </Text>
      </View>
      {FEATURES.map((f) => (
        <View
          key={f.label}
          className="flex-row items-center px-4 py-3 border-b border-gray-100"
        >
          <Text className="flex-1 text-sm text-gray-800">{f.label}</Text>
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
        isSuccess ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
      }`}
    >
      <Text
        className={`text-sm text-center ${
          isSuccess ? "text-green-700 font-medium" : "text-red-700"
        }`}
      >
        {message}
      </Text>
    </View>
  );
}

export function ActionButtons({
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
        <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Text className="text-sm text-amber-800 text-center font-medium">
            現在 Pro プランをご利用中です
          </Text>
        </View>
      ) : isWeb ? (
        <View className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <Text className="text-sm text-gray-600 text-center">
            アプリ内から購入してください
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          className={`bg-amber-500 rounded-xl py-4 items-center ${disabled ? "opacity-50" : ""}`}
          onPress={onPurchase}
          disabled={disabled}
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
        >
          {isRestoring ? (
            <ActivityIndicator color="#6b7280" size="small" />
          ) : (
            <View className="flex-row items-center">
              <RotateCcw size={14} color="#6b7280" />
              <Text className="ml-1.5 text-sm text-gray-500">購入を復元</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
