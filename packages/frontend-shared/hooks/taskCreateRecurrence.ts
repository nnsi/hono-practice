import { VALIDATION } from "@packages/types/validation";

import type { CreateTaskScheduleInput } from "../repositories/taskScheduleRepositoryLogic";

/** 作成ダイアログの「繰り返し」選択。`none` は従来通り Task を作る */
export type RecurrenceChoice = "none" | "interval" | "weekdays";

/** ISO weekday（1=月 … 7=日）。`DayTargets` / domain の `weekdaysSchema` と揃える */
export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export type RecurrenceFormState = {
  recurrenceType: RecurrenceChoice;
  intervalDays: number;
  weekdays: number[];
  startDate: string;
  endDate: string;
};

export type RecurrenceError = "intervalDays" | "weekdays" | "endDate";

/**
 * 繰り返し入力のバリデーション。`none` のときは常に null。
 * domain の `taskScheduleDataSchema` と同じ条件（日数 >= 1 の整数 / 曜日 1 つ以上 / 終了日 >= 開始日）を
 * submit 前に UI へ返すためのもの。
 */
export function validateRecurrence(
  state: RecurrenceFormState,
): RecurrenceError | null {
  if (state.recurrenceType === "none") return null;
  if (
    state.recurrenceType === "interval" &&
    (!Number.isInteger(state.intervalDays) || state.intervalDays < 1)
  ) {
    return "intervalDays";
  }
  if (state.recurrenceType === "weekdays" && state.weekdays.length === 0) {
    return "weekdays";
  }
  if (state.endDate && state.startDate && state.endDate < state.startDate) {
    return "endDate";
  }
  return null;
}

/** 数量が未入力（null）か、domain `taskScheduleFieldsSchema` の範囲（0〜999999）内か */
export function isValidScheduleQuantity(quantity: number | null): boolean {
  return (
    quantity === null ||
    (Number.isFinite(quantity) &&
      quantity >= VALIDATION.QUANTITY_MIN &&
      quantity <= VALIDATION.QUANTITY_MAX)
  );
}

/** メモが domain `taskScheduleFieldsSchema` の上限（1000 文字）以内か。保存値と同じく trim 後で見る */
export function isValidScheduleMemo(memo: string): boolean {
  return memo.trim().length <= VALIDATION.MEMO_MAX;
}

/** 曜日トグル。ISO weekday 順にソートし重複を持たない */
export function toggleWeekday(weekdays: number[], day: number): number[] {
  const next = weekdays.includes(day)
    ? weekdays.filter((d) => d !== day)
    : [...weekdays, day];
  return next.sort((a, b) => a - b);
}

type ScheduleBaseFields = {
  title: string;
  activityId: string | null;
  activityKindId: string | null;
  quantity: number | null;
  memo: string;
};

/**
 * フォーム状態から `createTaskSchedule` の入力を組み立てる。
 * `recurrenceType === "none"` のときは呼び出さないこと（呼び出し側で分岐する）。
 */
export function buildTaskScheduleInput(
  fields: ScheduleBaseFields,
  state: RecurrenceFormState,
  fallbackStartDate: string,
): CreateTaskScheduleInput {
  const common = {
    ...fields,
    startDate: state.startDate || fallbackStartDate,
    endDate: state.endDate || null,
    isActive: true,
  };
  return state.recurrenceType === "weekdays"
    ? {
        ...common,
        recurrenceType: "weekdays",
        weekdays: state.weekdays,
        intervalDays: null,
      }
    : {
        ...common,
        recurrenceType: "interval",
        intervalDays: state.intervalDays,
        weekdays: null,
      };
}
