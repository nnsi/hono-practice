import {
  ISO_WEEKDAYS,
  type RecurrenceChoice,
  type RecurrenceError,
} from "@packages/frontend-shared/hooks/taskCreateRecurrence";
import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity, View } from "react-native";

import { mobileTestIds } from "../../testing/testIds";
import { FormInput } from "../common/FormInput";

type Props = {
  recurrenceType: RecurrenceChoice;
  setRecurrenceType: (type: RecurrenceChoice) => void;
  intervalDays: number;
  setIntervalDays: (days: number) => void;
  weekdays: number[];
  toggleWeekday: (day: number) => void;
  error: RecurrenceError | null;
  /** 編集フォーム用: 「なし」を出さない（繰り返しを解除するのは削除で行う） */
  hideNone?: boolean;
};

type ChoiceLabelKey =
  | "create.none"
  | "create.recurrence.interval"
  | "create.recurrence.weekdays";

const CHOICES: { value: RecurrenceChoice; labelKey: ChoiceLabelKey }[] = [
  { value: "none", labelKey: "create.none" },
  { value: "interval", labelKey: "create.recurrence.interval" },
  { value: "weekdays", labelKey: "create.recurrence.weekdays" },
];

const chipClass = (selected: boolean) =>
  selected
    ? "bg-blue-600 border-blue-600"
    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600";
const chipTextClass = (selected: boolean) =>
  selected ? "text-white" : "text-gray-700 dark:text-gray-300";

export function TaskRecurrenceFields({
  recurrenceType,
  setRecurrenceType,
  intervalDays,
  setIntervalDays,
  weekdays,
  toggleWeekday,
  error,
  hideNone = false,
}: Props) {
  const { t } = useTranslation("task");
  const choices = hideNone
    ? CHOICES.filter((c) => c.value !== "none")
    : CHOICES;

  return (
    <View>
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {t("create.recurrence.label")}
      </Text>
      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {choices.map(({ value, labelKey }) => {
          const selected = recurrenceType === value;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setRecurrenceType(value)}
              className={`px-3 py-1.5 rounded-lg border ${chipClass(selected)}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t(labelKey)}
              testID={mobileTestIds.tasks.createRecurrenceOption(value)}
            >
              <Text className={`text-sm ${chipTextClass(selected)}`}>
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {recurrenceType === "interval" && (
        <View className="mt-2">
          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t("create.recurrence.intervalDays")}
          </Text>
          <FormInput
            value={Number.isNaN(intervalDays) ? "" : String(intervalDays)}
            onChangeText={(v) =>
              setIntervalDays(v === "" ? Number.NaN : Number(v))
            }
            keyboardType="number-pad"
            className="w-32"
            accessibilityLabel={t("create.recurrence.intervalDays")}
            testID={mobileTestIds.tasks.createIntervalDaysInput}
          />
        </View>
      )}

      {recurrenceType === "weekdays" && (
        <View className="flex-row flex-wrap gap-1.5 mt-2">
          {ISO_WEEKDAYS.map((day) => {
            const selected = weekdays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                onPress={() => toggleWeekday(day)}
                className={`w-9 h-9 rounded-full border items-center justify-center ${chipClass(selected)}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={t(`create.recurrence.weekday.${day}`)}
                testID={mobileTestIds.tasks.createWeekdayToggle(day)}
              >
                <Text className={`text-sm ${chipTextClass(selected)}`}>
                  {t(`create.recurrence.weekday.${day}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {error && (
        <Text
          className="text-xs text-red-500 dark:text-red-400 mt-1"
          accessibilityRole="alert"
        >
          {t(`create.recurrence.error.${error}`)}
        </Text>
      )}
    </View>
  );
}
