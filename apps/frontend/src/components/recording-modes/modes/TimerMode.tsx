import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { useTranslation } from "@packages/i18n";
import { Play, RotateCcw, Square } from "lucide-react";

import { FormButton } from "../../common/FormButton";
import { FormInput } from "../../common/FormInput";
import { KindSelector } from "../parts/KindSelector";
import { MemoInput } from "../parts/MemoInput";
import { useTimerMode } from "./useTimerMode";

export function TimerMode(props: RecordingModeProps) {
  const { t } = useTranslation("recording");
  const vm = useTimerMode(props);

  return (
    <>
      {/* タブ切り替え */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => vm.setActiveTab("manual")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            vm.effectiveTab === "manual"
              ? "bg-white text-black shadow-sm"
              : "text-gray-500"
          }`}
        >
          {t("manualEntry")}
        </button>
        <button
          type="button"
          onClick={() => vm.setActiveTab("timer")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            vm.effectiveTab === "timer"
              ? "bg-white text-black shadow-sm"
              : "text-gray-500"
          }`}
        >
          {t("timer")}
        </button>
      </div>

      {vm.effectiveTab === "timer" ? (
        <TimerPanel vm={vm} />
      ) : (
        <ManualPanel vm={vm} />
      )}
    </>
  );
}

function TimerPanel({ vm }: { vm: ReturnType<typeof useTimerMode> }) {
  const { t } = useTranslation("recording");
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center py-4">
        <div className="text-5xl font-mono font-bold tabular-nums tracking-tight">
          {vm.formattedTime}
        </div>
        {vm.isRunning && (
          <div className="text-sm text-gray-400 mt-2">{t("measuring")}</div>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        {vm.isRunning ? (
          <button
            type="button"
            onClick={vm.stop}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
          >
            <Square size={18} />
            {t("stop")}
          </button>
        ) : (
          <button
            type="button"
            onClick={vm.start}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            <Play size={18} />
            {vm.elapsedTime > 0 ? t("resume") : t("start")}
          </button>
        )}
        {vm.isStopped && (
          <button
            type="button"
            onClick={vm.reset}
            className="flex items-center gap-2 px-4 py-3 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={18} />
          </button>
        )}
      </div>

      {vm.isStopped && (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          <div className="text-center text-sm text-gray-500">
            {t("elapsedTime")}{" "}
            <span className="font-semibold text-black">
              {vm.convertedQuantity} {vm.quantityUnit}
            </span>
          </div>
          {vm.kinds.length > 0 && (
            <KindSelector
              kinds={vm.kinds}
              selectedKindId={vm.selectedKindId}
              onSelect={vm.setSelectedKindId}
            />
          )}
          <FormButton
            variant="primary"
            label={t("save")}
            onClick={vm.submitTimer}
            disabled={vm.isSubmitting}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}

function ManualPanel({ vm }: { vm: ReturnType<typeof useTimerMode> }) {
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
