import { Switch, Text, TouchableOpacity, View } from "react-native";

export type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export function Section({
  icon: Icon,
  label,
  shadow,
  children,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  shadow: ShadowStyle;
  children: React.ReactNode;
}) {
  return (
    <View className="mx-4 mt-4">
      <View className="flex-row items-center mb-2 ml-1">
        <Icon size={14} color="#9ca3af" />
        <Text className="ml-1.5 text-xs text-gray-400 uppercase tracking-wide">
          {label}
        </Text>
      </View>
      <View
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        style={shadow}
      >
        {children}
      </View>
    </View>
  );
}

export function Divider() {
  return <View className="border-t border-gray-100 mx-4" />;
}

export function SettingSwitch({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <View className="flex-1 mr-3">
        <Text className="text-sm font-medium text-gray-900">{label}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

export function InlineConfirm({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "削除する",
  error,
  disabled = false,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <View className="mx-3 my-2 bg-red-50 border border-red-200 rounded-lg p-4">
      <Text className="text-sm text-red-700 font-medium mb-3">{message}</Text>
      {error ? (
        <Text className="text-xs text-red-600 mb-2">{error}</Text>
      ) : null}
      <View className="flex-row gap-2">
        <TouchableOpacity
          className={`px-4 py-2 bg-red-600 rounded-lg ${disabled ? "opacity-50" : ""}`}
          onPress={onConfirm}
          disabled={disabled}
        >
          <Text className="text-sm text-white font-medium">
            {disabled ? "処理中..." : confirmLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-4 py-2 border border-gray-300 rounded-lg"
          onPress={onCancel}
          disabled={disabled}
        >
          <Text className="text-sm text-gray-700">キャンセル</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
