import { useRef } from "react";

import { useTranslation } from "@packages/i18n";
import { Text, type TextInput, View } from "react-native";

import { FormButton } from "../../common/FormButton";
import { FormInput } from "../../common/FormInput";
import { KindSelector } from "../parts/KindSelector";
import { MemoInput } from "../parts/MemoInput";
import type { useTimerMode } from "./useTimerMode";

export function TimerManualPanel({
  vm,
}: {
  vm: ReturnType<typeof useTimerMode>;
}) {
  const { t } = useTranslation("recording");
  const quantityRef = useRef<TextInput & { select?: () => void }>(null);

  return (
    <View className="gap-4">
      {vm.kinds.length > 0 && (
        <KindSelector
          kinds={vm.kinds}
          selectedKindId={vm.selectedKindId}
          onSelect={vm.setSelectedKindId}
        />
      )}
      <View>
        <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          {t("quantity")}
          {vm.quantityUnit ? ` (${vm.quantityUnit})` : ""}
        </Text>
        <FormInput
          ref={quantityRef}
          value={vm.quantity}
          onChangeText={vm.setQuantity}
          keyboardType="decimal-pad"
          onFocus={() => {
            setTimeout(() => {
              const node = quantityRef.current;
              if (node?.select) {
                node.select();
              } else {
                node?.setSelection(0, vm.quantity.length);
              }
            }, 0);
          }}
          accessibilityLabel={t("quantity")}
        />
      </View>
      <MemoInput value={vm.memo} onChangeText={vm.setMemo} />
      <FormButton
        variant="primary"
        label={vm.isSubmitting ? t("saving") : t("save")}
        onPress={vm.submitManual}
        disabled={vm.isSubmitting}
      />
    </View>
  );
}
