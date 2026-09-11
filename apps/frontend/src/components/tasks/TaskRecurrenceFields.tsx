import {
  ISO_WEEKDAYS,
  type RecurrenceChoice,
  type RecurrenceError,
} from "@packages/frontend-shared/hooks/taskCreateRecurrence";
import { useTranslation } from "@packages/i18n";

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
  `px-3 py-1.5 rounded-lg text-sm border transition-colors ${
    selected
      ? "bg-blue-600 text-white border-blue-600"
      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
  }`;

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
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t("create.recurrence.label")}
      </label>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {choices.map(({ value, labelKey }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={recurrenceType === value}
            onClick={() => setRecurrenceType(value)}
            className={chipClass(recurrenceType === value)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {recurrenceType === "interval" && (
        <div className="mt-2">
          <label className="block text-xs text-gray-500 mb-1">
            {t("create.recurrence.intervalDays")}
          </label>
          <FormInput
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={Number.isNaN(intervalDays) ? "" : intervalDays}
            onChange={(e) => setIntervalDays(e.target.valueAsNumber)}
            aria-label={t("create.recurrence.intervalDays")}
            className="max-w-[8rem]"
          />
        </div>
      )}

      {recurrenceType === "weekdays" && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {ISO_WEEKDAYS.map((day) => {
            const selected = weekdays.includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleWeekday(day)}
                className={`w-9 h-9 rounded-full text-sm border transition-colors ${
                  selected
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {t(`create.recurrence.weekday.${day}`)}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-1" role="alert">
          {t(`create.recurrence.error.${error}`)}
        </p>
      )}
    </div>
  );
}
