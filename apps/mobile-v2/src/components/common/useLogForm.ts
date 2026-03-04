import { useState } from "react";

import { getTimeUnitType, isTimeUnit } from "@packages/domain/time/timeUtils";
import { createUseLogForm } from "@packages/frontend-shared/hooks/useLogForm";

import { useActivityKinds } from "../../hooks/useActivityKinds";
import { useGoalNotificationScheduler } from "../../hooks/useGoalNotificationScheduler";
import { useTimer } from "../../hooks/useTimer";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";

export type UseTimerReturn = ReturnType<typeof useTimer>;

type Activity = {
  id: string;
  name: string;
  quantityUnit: string | null;
};

const useLogFormBase = createUseLogForm({
  react: { useState },
  useActivityKinds,
  useTimer,
  activityLogRepository,
  syncEngine,
});

export function useLogForm(
  activity: Activity,
  date: string,
  onDone: () => void,
) {
  const base = useLogFormBase(activity, date, onDone);
  const { scheduleOnTimerStart, cancelOnTimerStop } =
    useGoalNotificationScheduler();

  const timeUnitType = getTimeUnitType(activity.quantityUnit);
  const timerEnabled = isTimeUnit(activity.quantityUnit);

  const wrappedTimer = {
    ...base.timer,
    start: () => {
      const result = base.timer.start();
      if (result && timerEnabled) {
        scheduleOnTimerStart(activity.id, activity.name, timeUnitType);
      }
      return result;
    },
    stop: () => {
      base.timer.stop();
      cancelOnTimerStop();
    },
    reset: () => {
      base.timer.reset();
      cancelOnTimerStop();
    },
  };

  return {
    ...base,
    timer: wrappedTimer,
  };
}
