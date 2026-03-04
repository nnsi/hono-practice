import dayjs from "dayjs";

import type { ActivityBase, CreateGoalPayload, ReactHooks } from "./types";

type UseCreateGoalDialogDeps = {
  react: Pick<ReactHooks, "useState" | "useMemo">;
};

export function createUseCreateGoalDialog<TActivity extends ActivityBase>(
  deps: UseCreateGoalDialogDeps,
) {
  const {
    react: { useState, useMemo },
  } = deps;

  return function useCreateGoalDialog(
    activities: TActivity[],
    onCreate: (payload: CreateGoalPayload) => Promise<void>,
  ) {
    const [activityId, setActivityId] = useState("");
    const [target, setTarget] = useState("1");
    const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [endDate, setEndDate] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const selectedActivity = useMemo(
      () => activities.find((a) => a.id === activityId),
      [activities, activityId],
    );

    const resetForm = () => {
      setActivityId("");
      setTarget("1");
      setStartDate(dayjs().format("YYYY-MM-DD"));
      setEndDate("");
      setErrorMsg("");
    };

    const handleSubmit = async () => {
      setErrorMsg("");

      if (!activityId) {
        setErrorMsg("アクティビティを選択してください");
        return;
      }
      const parsedTarget = Number(target);
      if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
        setErrorMsg("日次目標は0より大きい数値を入力してください");
        return;
      }
      if (!startDate) {
        setErrorMsg("開始日を入力してください");
        return;
      }
      if (endDate && endDate < startDate) {
        setErrorMsg("終了日は開始日より後の日付にしてください");
        return;
      }

      setSubmitting(true);
      try {
        await onCreate({
          activityId,
          dailyTargetQuantity: parsedTarget,
          startDate,
          ...(endDate ? { endDate } : {}),
        });
        resetForm();
      } catch {
        setErrorMsg("作成に失敗しました");
      } finally {
        setSubmitting(false);
      }
    };

    return {
      activityId,
      setActivityId,
      target,
      setTarget,
      startDate,
      setStartDate,
      endDate,
      setEndDate,
      submitting,
      errorMsg,
      selectedActivity,
      resetForm,
      handleSubmit,
    };
  };
}
