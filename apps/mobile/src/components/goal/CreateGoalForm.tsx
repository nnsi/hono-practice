import { useTranslation } from "@packages/i18n";
import { Switch, Text, TouchableOpacity, View } from "react-native";

import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { ActivityIcon } from "../common/ActivityIcon";
import { DatePickerField } from "../common/DatePickerField";
import { IMESafeTextInput } from "../common/IMESafeTextInput";
import { OptionalDatePickerField } from "../common/OptionalDatePickerField";
import { DayTargetsInput } from "./DayTargetsInput";
import type { Activity } from "./types";

type CreateGoalFormProps = {
  activities: Activity[];
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
  selectedActivity: Activity | undefined;
  errorMsg: string;
};

export function CreateGoalForm({
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
}: CreateGoalFormProps) {
  const { t } = useTranslation("goal");
  const iconBlobMap = useIconBlobMap();

  return (
    <View className="gap-4">
      {/* Activity selection */}
      <View>
        <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          {t("activityLabel")}
        </Text>
        {activities.length === 0 ? (
          <Text className="text-sm text-gray-400 dark:text-gray-500">{t("noActivities")}</Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {activities.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setActivityId(a.id)}
                className={`items-center p-2 rounded-lg border min-w-[80px] ${
                  activityId === a.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                }`}
              >
                <ActivityIcon
                  iconType={a.iconType}
                  emoji={a.emoji || "\u{1f4dd}"}
                  iconBlob={iconBlobMap.get(a.id)}
                  iconUrl={a.iconUrl}
                  iconThumbnailUrl={a.iconThumbnailUrl}
                  size={28}
                  fontSize="text-xl"
                />
                <Text
                  className="text-[10px] mt-1 text-center"
                  numberOfLines={1}
                >
                  {a.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Daily target */}
      <View>
        <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          {t("dailyTargetLabel")}
          {selectedActivity?.quantityUnit ? (
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              {" "}
              ({selectedActivity.quantityUnit})
            </Text>
          ) : null}
        </Text>
        <IMESafeTextInput
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-base"
          value={target}
          onChangeText={setTarget}
          keyboardType="numeric"
          selectTextOnFocus
        />
      </View>

      {/* Dates */}
      <View className="flex-row gap-3">
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
      <DayTargetsInput
        enabled={dayTargetsEnabled}
        onToggle={setDayTargetsEnabled}
        values={dayTargetValues}
        onChange={setDayTargetValues}
        defaultTarget={target}
      />

      {/* Debt cap */}
      <View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
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
            <IMESafeTextInput
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-base"
              value={debtCapValue}
              onChangeText={setDebtCapValue}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {selectedActivity?.quantityUnit ?? ""}
            </Text>
          </View>
        )}
      </View>

      {/* Error message */}
      {errorMsg ? (
        <Text className="text-sm text-red-500 dark:text-red-400">{errorMsg}</Text>
      ) : null}
    </View>
  );
}
