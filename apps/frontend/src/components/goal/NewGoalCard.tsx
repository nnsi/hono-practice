import { useMemo } from "react";

import type { GetActivityResponse, GoalResponse } from "@dtos/response";
import { useNewGoalCard } from "@frontend/hooks/feature/goal/useNewGoalCard";

import { GoalCardDisplay } from "./GoalCardDisplay";
import { GoalCardEditForm } from "./GoalCardEditForm";

type GoalCardProps = {
  goal: GoalResponse;
  activityName: string;
  activityEmoji: string;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  activities: GetActivityResponse[];
  quantityUnit?: string;
  activity?: GetActivityResponse;
  isPast?: boolean;
  hideGraph?: boolean;
};

export const NewGoalCard: React.FC<GoalCardProps> = ({
  goal,
  activityName,
  activityEmoji,
  isEditing,
  onEditStart,
  onEditEnd,
  quantityUnit = "",
  activity,
  isPast = false,
  hideGraph = false,
}) => {
  const hookValues = useNewGoalCard(goal, onEditEnd, isPast);

  const thisMonthInactiveDates = useMemo(() => {
    if (!goal.inactiveDates?.length) return [];
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return goal.inactiveDates.filter((date) =>
      date.startsWith(currentYearMonth),
    );
  }, [goal.inactiveDates]);

  if (isEditing) {
    return (
      <GoalCardEditForm
        activityName={activityName}
        activityEmoji={activityEmoji}
        quantityUnit={quantityUnit}
        activity={activity}
        hideGraph={hideGraph}
        hookValues={hookValues}
        onEditEnd={onEditEnd}
      />
    );
  }

  return (
    <GoalCardDisplay
      goal={goal}
      activityName={activityName}
      activityEmoji={activityEmoji}
      quantityUnit={quantityUnit}
      activity={activity}
      hideGraph={hideGraph}
      hookValues={hookValues}
      thisMonthInactiveDates={thisMonthInactiveDates}
      onEditStart={onEditStart}
    />
  );
};
