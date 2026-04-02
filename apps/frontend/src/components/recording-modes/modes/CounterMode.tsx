import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { useTranslation } from "@packages/i18n";
import { Plus } from "lucide-react";

import { FormButton } from "../../common/FormButton";
import { FormInput } from "../../common/FormInput";
import { KindSelector } from "../parts/KindSelector";
import { MemoInput } from "../parts/MemoInput";
import { useCounterMode } from "./useCounterMode";

export function CounterMode(props: RecordingModeProps) {
  const { t } = useTranslation("recording");
  const vm = useCounterMode(props);

  return (
    <>
      {/* タブ切り替え */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => vm.setActiveTab("manual")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            vm.activeTab === "manual"
              ? "bg-white text-black shadow-sm"
              : "text-gray-500"
          }`}
        >
          {t("manualEntry")}
        </button>
        <button
          type="button"
          onClick={() => vm.setActiveTab("counter")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            vm.activeTab === "counter"
              ? "bg-white text-black shadow-sm"
              : "text-gray-500"
          }`}
        >
          {t("counter")}
        </button>
      </div>

      {vm.activeTab === "counter" ? (
        <CounterPanel vm={vm} />
      ) : (
        <ManualPanel vm={vm} />
      )}
    </>
  );
}

function CounterPanel({ vm }: { vm: ReturnType<typeof useCounterMode> }) {
  const { t } = useTranslation("recording");
  return (
    <div className="space-y-4">
      {vm.todayTotal > 0 && (
        <div className="text-center text-sm text-gray-500">
          {t("todayTotal")}{" "}
          <span className="font-semibold text-black">
            {vm.todayTotal} {vm.quantityUnit}
          </span>
        </div>
      )}

      {vm.kinds.length > 0 && (
        <KindSelector
          kinds={vm.kinds}
          selectedKindId={vm.selectedKindId}
          onSelect={vm.setSelectedKindId}
        />
      )}

      <div className="flex gap-2">
        {vm.steps.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => vm.recordStep(step)}
            disabled={vm.isSubmitting}
            className="flex-1 flex items-center justify-center gap-1 py-3 bg-blue-500 text-white rounded-lg text-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <Plus size={18} />
            {step}
          </button>
        ))}
      </div>
    </div>
  );
}

function ManualPanel({ vm }: { vm: ReturnType<typeof useCounterMode> }) {
  const { t } = useTranslation("recording");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        vm.submitManual();
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
