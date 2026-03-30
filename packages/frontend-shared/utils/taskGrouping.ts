import { groupTasksByTimeline as groupTasksByTimelineCore } from "@packages/domain/task/taskGrouping";
import type {
  GroupedTasks,
  GroupingOptions,
  TaskItem,
} from "@packages/domain/task/types";

import { getToday } from "./dateUtils";

export function groupTasksByTimeline(
  tasks: TaskItem[],
  options: GroupingOptions,
): GroupedTasks {
  return groupTasksByTimelineCore(tasks, options, getToday());
}
