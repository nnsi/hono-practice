import { useMemo, useState } from "react";
import dayjs from "dayjs";
import type { DexieActivity } from "../../db/schema";
import type { CreateGoalPayload } from "./types";

export function useCreateGoalDialog(
  activities: DexieActivity[],
  onCreate: (payload: CreateGoalPayload) => Promise<void>,
) {
  // --- state ---
  const [activityId, setActivityId] = useState("");
  const [target, setTarget] = useState("1");
  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // --- computed ---
  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === activityId),
    [activities, activityId],
  );

  // --- handlers ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    } catch {
      setErrorMsg("作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  // --- return ---
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
    handleSubmit,
  };
}
