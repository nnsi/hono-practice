import { useTranslation } from "@packages/i18n";

import type { DexieActivity } from "../../db/schema";
import { DatePickerField } from "../common/DatePickerField";
import { FormInput } from "../common/FormInput";
import { DayTargetsInput } from "./DayTargetsInput";

type EditGoalFieldsProps = {
  activity: DexieActivity | undefined;
  target: string;
  setTarget: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  dayTargetsEnabled: boolean;
  setDayTargetsEnabled: (v: boolean) => void;
  dayTargetValues: Record<string, string>;
  setDayTargetValues: (v: Record<string, string>) => void;
  debtCapEnabled: boolean;
  setDebtCapEnabled: (v: boolean) => void;
  debtCapValue: string;
  setDebtCapValue: (v: string) => void;
  errorMsg: string;
};

export function EditGoalFields({
  activity,
  target,
  setTarget,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  dayTargetsEnabled,
  setDayTargetsEnabled,
  dayTargetValues,
  setDayTargetValues,
  debtCapEnabled,
  setDebtCapEnabled,
  debtCapValue,
  setDebtCapValue,
  errorMsg,
}: EditGoalFieldsProps) {
  const { t } = useTranslation("goal");

  return (
    <>
      {/* 日次目標 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t("dailyTargetLabel")}{" "}
          {activity?.quantityUnit && `(${activity.quantityUnit})`}
        </label>
        <FormInput
          type="number"
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          min="0"
          step="any"
        />
      </div>

      {/* 日付 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t("startDateLabel")}
          </label>
          <DatePickerField value={startDate} onChange={setStartDate} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t("endDateLabel")}
          </label>
          <DatePickerField
            value={endDate}
            onChange={setEndDate}
            placeholder={t("endDatePlaceholder")}
            allowClear
          />
        </div>
      </div>

      {/* 曜日別目標 */}
      <DayTargetsInput
        enabled={dayTargetsEnabled}
        onToggle={setDayTargetsEnabled}
        values={dayTargetValues}
        onChange={setDayTargetValues}
        defaultTarget={target}
      />

      {/* 負債上限 */}
      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
          <input
            type="checkbox"
            checked={debtCapEnabled}
            onChange={(e) => {
              setDebtCapEnabled(e.target.checked);
              if (e.target.checked && !debtCapValue) {
                setDebtCapValue(String(Number(target) * 7));
              }
            }}
            className="rounded"
          />
          {t("debtCapLabel")}
        </label>
        {debtCapEnabled && (
          <div className="flex items-center gap-1 mt-1">
            <FormInput
              type="number"
              inputMode="decimal"
              value={debtCapValue}
              onChange={(e) => setDebtCapValue(e.target.value)}
              className="w-24"
              min="0"
              step="any"
            />
            <span className="text-xs text-gray-500">
              {activity?.quantityUnit ?? ""}
            </span>
          </div>
        )}
      </div>

      {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
    </>
  );
}
