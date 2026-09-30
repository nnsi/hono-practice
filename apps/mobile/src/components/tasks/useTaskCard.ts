import { getToday } from "@packages/frontend-shared/utils/dateUtils";

import { useTaskActivityData } from "./TaskActivityProvider";
import type { TaskItem } from "./types";

export function useTaskCard(
  task: TaskItem,
  archived: boolean,
  onMoveToToday?: () => void,
) {
  const { activityMap, kindMap, iconBlobMap } = useTaskActivityData();
  const linkedActivity = task.activityId
    ? (activityMap.get(task.activityId) ?? null)
    : null;
  const kind = task.activityKindId ? kindMap.get(task.activityKindId) : null;
  const linkedKind =
    task.activityId && kind?.activityId === task.activityId && !kind.deletedAt
      ? kind
      : null;

  const today = getToday();
  const showMoveToToday =
    !archived && !task.doneDate && task.startDate !== today && onMoveToToday;

  return { linkedActivity, linkedKind, iconBlobMap, showMoveToToday };
}
