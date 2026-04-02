import { useTranslation } from "@packages/i18n";
import { Text, View } from "react-native";

import { FormTextarea } from "../../common/FormTextarea";
import { useModalScroll } from "../../common/ModalOverlay";

type MemoInputProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function MemoInput({ value, onChangeText }: MemoInputProps) {
  const { t } = useTranslation("recording");
  const { scrollToEnd } = useModalScroll();
  return (
    <View>
      <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {t("memo")}
      </Text>
      <FormTextarea
        value={value}
        onChangeText={onChangeText}
        onFocus={scrollToEnd}
        placeholder={t("memoPlaceholder")}
        numberOfLines={2}
        accessibilityLabel={t("memo")}
      />
    </View>
  );
}
