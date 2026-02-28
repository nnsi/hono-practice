import { useMemo, useState } from "react";
import dayjs from "dayjs";
import type { CreateGoalPayload } from "./types";

type ActivityItem = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
};

export function useCreateGoalDialog(
  activities: ActivityItem[],
  onCreate: (payload: CreateGoalPayload) => Promise<void>,
) {
  // state
  const [activityId, setActivityId] = useState("");
  const [target, setTarget] = useState("1");
  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // computed
  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === activityId),
    [activities, activityId],
  );

  // handlers
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
    // form state
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
    // computed
    selectedActivity,
    // handlers
    resetForm,
    handleSubmit,
  };
}
