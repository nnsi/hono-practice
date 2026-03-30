import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity } from "react-native";

type SaveButtonProps = {
  onPress: () => void;
  disabled: boolean;
  label?: string;
};

export function SaveButton({ onPress, disabled, label }: SaveButtonProps) {
  const { t } = useTranslation("recording");
  const displayLabel = label ?? t("save");
  return (
    <TouchableOpacity
      className={`py-3 rounded-lg items-center mb-4 ${
        disabled ? "bg-gray-400" : "bg-gray-900"
      }`}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={displayLabel}
      accessibilityState={{ disabled }}
    >
      <Text className="text-white font-medium">
        {disabled ? t("saving") : displayLabel}
      </Text>
    </TouchableOpacity>
  );
}
