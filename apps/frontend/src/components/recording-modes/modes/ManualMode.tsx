import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { useTranslation } from "@packages/i18n";

import { FormButton } from "../../common/FormButton";
import { FormInput } from "../../common/FormInput";
import { KindSelector } from "../parts/KindSelector";
import { MemoInput } from "../parts/MemoInput";
import { useManualMode } from "./useManualMode";

export function ManualMode(props: RecordingModeProps) {
  const { t } = useTranslation("recording");
  const vm = useManualMode(props);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        vm.submit();
      }}
      className="space-y-4"
    >
      {vm.kinds.length > 0 && (
        <KindSelector
          kinds={vm.kinds}
          selectedKindId={vm.selectedKindId}
          onSelect={vm.setSelectedKindId}
        />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          {t("quantity")} {vm.quantityUnit && `(${vm.quantityUnit})`}
        </label>
        <FormInput
          type="number"
          inputMode="decimal"
          value={vm.quantity}
          onChange={(e) => vm.setQuantity(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="text-lg"
          min="0"
          step="any"
          autoFocus
        />
      </div>

      <MemoInput value={vm.memo} onChange={vm.setMemo} />
      <FormButton
        type="submit"
        variant="primary"
        label={t("save")}
        disabled={vm.isSubmitting}
        className="w-full"
      />
    </form>
  );
}
