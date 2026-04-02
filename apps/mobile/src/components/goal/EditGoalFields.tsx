import { useTranslation } from "@packages/i18n";
import { Switch, Text, View } from "react-native";

import { DatePickerField } from "../common/DatePickerField";
import { FormInput } from "../common/FormInput";
import { OptionalDatePickerField } from "../common/OptionalDatePickerField";
import { DayTargetsInput } from "./DayTargetsInput";
import type { Activity } from "./types";

type EditGoalFieldsProps = {
  activity: Activity | null;
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
      {/* Daily target */}
      <View className="mb-3">
        <Text className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {t("dailyTargetLabel")}
          {activity?.quantityUnit ? ` (${activity.quantityUnit})` : ""}
        </Text>
        <FormInput
          className="w-full"
          value={target}
          onChangeText={setTarget}
          keyboardType="numeric"
          selectTextOnFocus
          accessibilityLabel={t("dailyTargetLabel")}
        />
      </View>

      {/* Dates */}
      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <DatePickerField
            value={startDate}
            onChange={setStartDate}
            label={t("startDateLabel")}
          />
        </View>
        <View className="flex-1">
          <OptionalDatePickerField
            value={endDate}
            onChange={setEndDate}
            label={t("endDateLabel")}
          />
        </View>
      </View>

      {/* Day targets */}
      <View className="mb-3">
        <DayTargetsInput
          enabled={dayTargetsEnabled}
          onToggle={setDayTargetsEnabled}
          values={dayTargetValues}
          onChange={setDayTargetValues}
          defaultTarget={target}
        />
      </View>

      {/* Debt cap */}
      <View className="mb-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {t("debtCapLabel")}
          </Text>
          <Switch
            value={debtCapEnabled}
            onValueChange={(v) => {
              setDebtCapEnabled(v);
              if (v && !debtCapValue) {
                setDebtCapValue(String(Number(target) * 7));
              }
            }}
          />
        </View>
        {debtCapEnabled && (
          <View className="flex-row items-center gap-2 mt-1">
            <FormInput
              className="w-24"
              value={debtCapValue}
              onChangeText={setDebtCapValue}
              keyboardType="numeric"
              selectTextOnFocus
              accessibilityLabel={t("debtCapLabel")}
            />
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {activity?.quantityUnit ?? ""}
            </Text>
          </View>
        )}
      </View>

      {errorMsg ? (
        <Text className="text-red-500 dark:text-red-400 text-sm mb-2">
          {errorMsg}
        </Text>
      ) : null}
    </>
  );
}
