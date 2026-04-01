import { useTranslation } from "@packages/i18n";

import type { DexieActivity } from "../../db/schema";
import { DatePickerField } from "../common/DatePickerField";
import { FormInput } from "../common/FormInput";
import { getActivityEmoji } from "./activityHelpers";
import { DayTargetsInput } from "./DayTargetsInput";

type CreateGoalFieldsProps = {
  activities: DexieActivity[];
  activityId: string;
  setActivityId: (id: string) => void;
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
  selectedActivity: DexieActivity | undefined;
  errorMsg: string;
};

export function CreateGoalFields({
  activities,
  activityId,
  setActivityId,
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
  selectedActivity,
  errorMsg,
}: CreateGoalFieldsProps) {
  const { t } = useTranslation("goal");

  return (
    <>
      {/* アクティビティ選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          {t("activityLabel")}
        </label>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noActivities")}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {activities.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setActivityId(a.id)}
                className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${
                  activityId === a.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="text-xl">{getActivityEmoji(a)}</span>
                <span className="text-[10px] mt-1 truncate w-full text-center">
                  {a.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 日次目標 */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          {t("dailyTargetLabel")}
          {selectedActivity?.quantityUnit && (
            <span className="ml-1 text-xs text-gray-400">
              ({selectedActivity.quantityUnit})
            </span>
          )}
        </label>
        <FormInput
          type="number"
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="text-lg"
          min="0"
          step="any"
        />
      </div>

      {/* 日付 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            {t("startDateLabel")}
          </label>
          <DatePickerField value={startDate} onChange={setStartDate} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
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
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
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
              {selectedActivity?.quantityUnit ?? ""}
            </span>
          </div>
        )}
      </div>

      {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
    </>
  );
}
