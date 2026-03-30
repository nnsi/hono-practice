import { useMemo } from "react";

import { getToday } from "@packages/frontend-shared/utils/dateUtils";

import { useLiveQuery } from "../../db/useLiveQuery";
import { useActivities } from "../../hooks/useActivities";
import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { activityRepository } from "../../repositories/activityRepository";
import type { TaskItem } from "./types";

export function useTaskCard(
  task: TaskItem,
  archived: boolean,
  onMoveToToday?: () => void,
) {
  const { activities } = useActivities();
  const activityMap = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        emoji: string;
        quantityUnit: string;
        iconType?: "emoji" | "upload" | "generate";
        iconUrl?: string | null;
        iconThumbnailUrl?: string | null;
      }
    >();
    for (const a of activities) {
      map.set(a.id, {
        name: a.name,
        emoji: a.emoji,
        quantityUnit: a.quantityUnit,
        iconType: a.iconType,
        iconUrl: a.iconUrl,
        iconThumbnailUrl: a.iconThumbnailUrl,
      });
    }
    return map;
  }, [activities]);

  const iconBlobMap = useIconBlobMap();

  const linkedActivity = task.activityId
    ? activityMap.get(task.activityId)
    : null;

  const allKinds = useLiveQuery(
    "activity_kinds",
    () =>
      task.activityId && task.activityKindId
        ? activityRepository.getActivityKindsByActivityId(task.activityId)
        : Promise.resolve([]),
    [task.activityId, task.activityKindId],
  );
  const linkedKind = task.activityKindId
    ? (allKinds ?? []).find((k) => k.id === task.activityKindId && !k.deletedAt)
    : null;

  const today = getToday();
  const showMoveToToday =
    !archived && !task.doneDate && task.startDate !== today && onMoveToToday;

  return { linkedActivity, linkedKind, iconBlobMap, showMoveToToday };
}
