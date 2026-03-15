import { groupTasksByTimeline as groupTasksByTimelineCore } from "@packages/domain/task/taskGrouping";
import type {
  GroupedTasks,
  GroupingOptions,
  TaskItem,
} from "@packages/domain/task/types";
import dayjs from "dayjs";

export function groupTasksByTimeline(
  tasks: TaskItem[],
  options: GroupingOptions,
): GroupedTasks {
  const today = dayjs().format("YYYY-MM-DD");
  return groupTasksByTimelineCore(tasks, options, today);
}
