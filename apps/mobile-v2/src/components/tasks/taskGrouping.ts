import dayjs from "dayjs";
import { groupTasksByTimeline as groupTasksByTimelineCore } from "@packages/domain/task/taskGrouping";
import type {
  TaskItem,
  GroupingOptions,
  GroupedTasks,
} from "@packages/domain/task/types";

export function groupTasksByTimeline(
  tasks: TaskItem[],
  options: GroupingOptions,
): GroupedTasks {
  const today = dayjs().format("YYYY-MM-DD");
  return groupTasksByTimelineCore(tasks, options, today);
}
