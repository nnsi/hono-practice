import { useTranslation } from "@packages/i18n";
import { VALIDATION as V } from "@packages/types/validation";
import { Text, View } from "react-native";

import { FormInput } from "../common/FormInput";

export function TaskQuantityField({
  quantity,
  setQuantity,
  quantityUnit,
}: {
  quantity: number | null;
  setQuantity: (quantity: number | null) => void;
  quantityUnit?: string;
}) {
  const { t } = useTranslation("task");
  return (
    <View>
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {t("create.label.quantityOptional")}
        {quantityUnit ? `（${quantityUnit}）` : ""}
      </Text>
      <FormInput
        value={quantity !== null ? String(quantity) : ""}
        onChangeText={(v) => {
          const parsed = Number.parseFloat(v);
          if (v === "" || Number.isNaN(parsed)) {
            setQuantity(null);
            return;
          }
          // Web の input min/max 相当: schema の範囲（0〜999999）に収める
          setQuantity(
            Math.min(Math.max(parsed, V.QUANTITY_MIN), V.QUANTITY_MAX),
          );
        }}
        placeholder={t("create.placeholder.quantityMobile")}
        keyboardType="decimal-pad"
        accessibilityLabel={t("create.label.quantityOptional")}
      />
    </View>
  );
}
