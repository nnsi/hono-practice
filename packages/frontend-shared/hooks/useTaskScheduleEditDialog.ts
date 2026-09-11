import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";

import type { UpdateTaskScheduleInput } from "../repositories/taskScheduleRepositoryLogic";
import {
  type RecurrenceChoice,
  type RecurrenceFormState,
  isValidScheduleMemo,
  isValidScheduleQuantity,
  toggleWeekday as toggleWeekdayIn,
  validateRecurrence,
} from "./taskCreateRecurrence";
import type { ReactHooks } from "./types";
import { isValidTaskTitle } from "./useTaskCreateDialog";

type UseTaskScheduleEditDialogDeps = {
  react: Pick<ReactHooks, "useState">;
  taskScheduleRepository: {
    updateTaskSchedule: (
      id: string,
      changes: UpdateTaskScheduleInput,
    ) => Promise<unknown>;
  };
  syncEngine: { syncTaskSchedules: () => Promise<unknown> };
};

type EditableRecurrence = Exclude<RecurrenceChoice, "none">;

/** フォーム状態から `updateTaskSchedule` の changes を組み立てる（純粋関数。テスト用に公開） */
export function buildTaskScheduleChanges(
  fields: {
    title: string;
    activityId: string | null;
    activityKindId: string | null;
    quantity: number | null;
    memo: string;
  },
  recurrence: RecurrenceFormState & { recurrenceType: EditableRecurrence },
): UpdateTaskScheduleInput {
  const common = {
    ...fields,
    startDate: recurrence.startDate,
    endDate: recurrence.endDate || null,
  };
  return recurrence.recurrenceType === "weekdays"
    ? {
        ...common,
        recurrenceType: "weekdays",
        weekdays: recurrence.weekdays,
        intervalDays: null,
      }
    : {
        ...common,
        recurrenceType: "interval",
        intervalDays: recurrence.intervalDays,
        weekdays: null,
      };
}

/**
 * 繰り返し（TaskSchedule）の編集ダイアログ。作成時と同じ `validateRecurrence` で検証し、
 * `updateTaskSchedule` に保存後 `syncTaskSchedules` を fire-and-forget する。
 * 仮想タスクは表示時算出なので保存後すぐ一覧に反映される（完了済み Task 行は触らない）。
 */
export function createUseTaskScheduleEditDialog(
  deps: UseTaskScheduleEditDialogDeps,
) {
  const {
    react: { useState },
    taskScheduleRepository,
    syncEngine,
  } = deps;

  return function useTaskScheduleEditDialog(
    schedule: TaskScheduleRecord,
    onSuccess: () => void,
  ) {
    const [title, setTitle] = useState(schedule.title);
    const [activityId, setActivityId] = useState<string | null>(
      schedule.activityId,
    );
    const [activityKindId, setActivityKindId] = useState<string | null>(
      schedule.activityKindId,
    );
    const [quantity, setQuantity] = useState<number | null>(schedule.quantity);
    const [recurrenceType, setRecurrenceTypeState] =
      useState<EditableRecurrence>(schedule.recurrenceType);
    const [intervalDays, setIntervalDays] = useState(
      schedule.intervalDays ?? 1,
    );
    const [weekdays, setWeekdays] = useState<number[]>([
      ...(schedule.weekdays ?? []),
    ]);
    const [startDate, setStartDate] = useState(schedule.startDate);
    const [endDate, setEndDate] = useState(schedule.endDate ?? "");
    const [memo, setMemo] = useState(schedule.memo ?? "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // `TaskRecurrenceFields` は「なし」も含む RecurrenceChoice を返す。編集では「なし」に戻せない
    const setRecurrenceType = (type: RecurrenceChoice) => {
      if (type !== "none") setRecurrenceTypeState(type);
    };

    const recurrenceState = {
      recurrenceType,
      intervalDays,
      weekdays,
      startDate,
      endDate,
    };
    const recurrenceError = validateRecurrence(recurrenceState);
    const canSubmit =
      !isSubmitting &&
      isValidTaskTitle(title) &&
      isValidScheduleQuantity(quantity) &&
      isValidScheduleMemo(memo) &&
      !!startDate &&
      !recurrenceError;

    const toggleWeekday = (day: number) =>
      setWeekdays((prev) => toggleWeekdayIn(prev, day));

    const handleSubmit = async () => {
      if (!canSubmit) return;
      setIsSubmitting(true);
      try {
        await taskScheduleRepository.updateTaskSchedule(
          schedule.id,
          buildTaskScheduleChanges(
            {
              title: title.trim(),
              activityId,
              activityKindId,
              quantity,
              memo: memo.trim(),
            },
            recurrenceState,
          ),
        );
        void syncEngine.syncTaskSchedules().catch(() => {});
      } finally {
        setIsSubmitting(false);
      }
      onSuccess();
    };

    return {
      title,
      setTitle,
      activityId,
      setActivityId,
      activityKindId,
      setActivityKindId,
      quantity,
      setQuantity,
      recurrenceType,
      setRecurrenceType,
      intervalDays,
      setIntervalDays,
      weekdays,
      toggleWeekday,
      startDate,
      setStartDate,
      endDate,
      setEndDate,
      memo,
      setMemo,
      recurrenceError,
      canSubmit,
      isSubmitting,
      handleSubmit,
    };
  };
}
