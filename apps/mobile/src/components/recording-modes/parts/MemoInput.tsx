import { useTranslation } from "@packages/i18n";
import { Text, View } from "react-native";

import { IMESafeTextInput } from "../../common/IMESafeTextInput";

type MemoInputProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function MemoInput({ value, onChangeText }: MemoInputProps) {
  const { t } = useTranslation("recording");
  return (
    <View>
      <Text className="text-sm font-medium text-gray-600 mb-1">{t("memo")}</Text>
      <IMESafeTextInput
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        value={value}
        onChangeText={onChangeText}
        placeholder={t("memoPlaceholder")}
        multiline
        numberOfLines={2}
      />
    </View>
  );
}
