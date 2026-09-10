import { VALIDATION } from "@packages/types/validation";

import type { CreateTaskScheduleInput } from "../repositories/taskScheduleRepositoryLogic";
import { getToday } from "../utils/dateUtils";
import {
  type RecurrenceChoice,
  buildTaskScheduleInput,
  isValidScheduleMemo,
  isValidScheduleQuantity,
  toggleWeekday as toggleWeekdayIn,
  validateRecurrence,
} from "./taskCreateRecurrence";
import type { ReactHooks } from "./types";

type UseTaskCreateDialogDeps = {
  react: Pick<ReactHooks, "useState">;
  taskRepository: {
    createTask: (data: {
      title: string;
      activityId: string | null;
      activityKindId: string | null;
      quantity: number | null;
      startDate: string | null;
      dueDate: string | null;
      memo: string;
    }) => Promise<unknown>;
  };
  taskScheduleRepository: {
    createTaskSchedule: (input: CreateTaskScheduleInput) => Promise<unknown>;
  };
  syncEngine: { syncTasks: () => void; syncTaskSchedules: () => void };
};

/** 空でなく、schema（recurrenceSchema / taskSchema）の上限以内か */
export function isValidTaskTitle(title: string): boolean {
  const trimmed = title.trim();
  return trimmed.length > 0 && trimmed.length <= VALIDATION.TASK_TITLE_MAX;
}

export function createUseTaskCreateDialog(deps: UseTaskCreateDialogDeps) {
  const {
    react: { useState },
    taskRepository,
    taskScheduleRepository,
    syncEngine,
  } = deps;

  return function useTaskCreateDialog(
    onSuccess: () => void,
    defaultDate?: string,
  ) {
    const [title, setTitle] = useState("");
    const [activityId, setActivityId] = useState<string | null>(null);
    const [activityKindId, setActivityKindId] = useState<string | null>(null);
    const [quantity, setQuantity] = useState<number | null>(null);
    const [startDate, setStartDate] = useState(defaultDate ?? getToday());
    // 繰り返しありのときは「終了日（任意）」として読み替える
    const [dueDate, setDueDate] = useState("");
    const [memo, setMemo] = useState("");
    const [recurrenceType, setRecurrenceType] =
      useState<RecurrenceChoice>("none");
    const [intervalDays, setIntervalDays] = useState(1);
    const [weekdays, setWeekdays] = useState<number[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const recurrenceState = {
      recurrenceType,
      intervalDays,
      weekdays,
      startDate,
      endDate: dueDate,
    };
    const recurrenceError = validateRecurrence(recurrenceState);
    const isRecurring = recurrenceType !== "none";
    // 繰り返しは TaskSchedule の schema（数量 0〜999999 / メモ 1000 文字）で保存時に検証されるので UI 側でも塞ぐ
    const isScheduleFieldsValid =
      !isRecurring ||
      (isValidScheduleQuantity(quantity) && isValidScheduleMemo(memo));
    const canSubmit =
      !isSubmitting &&
      isValidTaskTitle(title) &&
      !recurrenceError &&
      isScheduleFieldsValid;

    const toggleWeekday = (day: number) =>
      setWeekdays((prev) => toggleWeekdayIn(prev, day));

    const handleSubmit = async () => {
      if (!canSubmit) return;

      const fields = {
        title: title.trim(),
        activityId,
        activityKindId,
        quantity,
        memo: memo.trim(),
      };
      setIsSubmitting(true);
      try {
        if (isRecurring) {
          await taskScheduleRepository.createTaskSchedule(
            buildTaskScheduleInput(fields, recurrenceState, getToday()),
          );
          syncEngine.syncTaskSchedules();
        } else {
          await taskRepository.createTask({
            ...fields,
            startDate: startDate || null,
            dueDate: dueDate || null,
          });
          syncEngine.syncTasks();
        }
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
      startDate,
      setStartDate,
      dueDate,
      setDueDate,
      memo,
      setMemo,
      recurrenceType,
      setRecurrenceType,
      intervalDays,
      setIntervalDays,
      weekdays,
      toggleWeekday,
      recurrenceError,
      isRecurring,
      canSubmit,
      isSubmitting,
      handleSubmit,
    };
  };
}
