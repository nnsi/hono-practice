import { buildDayTargets } from "@packages/domain/goal/dayTargets";
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
    const [dayTargetsEnabled, setDayTargetsEnabled] = useState(false);
    const [dayTargetValues, setDayTargetValues] = useState<
      Record<string, string>
    >({});
    const [debtCapEnabled, setDebtCapEnabled] = useState(false);
    const [debtCapValue, setDebtCapValue] = useState("");
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
      setDayTargetsEnabled(false);
      setDayTargetValues({});
      setDebtCapEnabled(false);
      setDebtCapValue("");
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

      const parsedDebtCap = debtCapEnabled ? Number(debtCapValue) : null;
      if (debtCapEnabled) {
        if (!Number.isFinite(parsedDebtCap) || (parsedDebtCap as number) <= 0) {
          setErrorMsg("負債上限は0より大きい数値を入力してください");
          return;
        }
      }

      setSubmitting(true);
      try {
        await onCreate({
          activityId,
          dailyTargetQuantity: parsedTarget,
          dayTargets: dayTargetsEnabled
            ? buildDayTargets(dayTargetValues)
            : null,
          startDate,
          ...(endDate ? { endDate } : {}),
          debtCap: parsedDebtCap,
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
      dayTargetsEnabled,
      setDayTargetsEnabled,
      dayTargetValues,
      setDayTargetValues,
      debtCapEnabled,
      setDebtCapEnabled,
      debtCapValue,
      setDebtCapValue,
      submitting,
      errorMsg,
      selectedActivity,
      resetForm,
      handleSubmit,
    };
  };
}
