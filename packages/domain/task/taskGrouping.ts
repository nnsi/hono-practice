import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import type { GroupedTasks, GroupingOptions, TaskItem } from "./types";

dayjs.extend(isBetween);

export function groupTasksByTimeline(
  tasks: TaskItem[],
  options: GroupingOptions,
  today: string,
): GroupedTasks {
  const todayDate = dayjs(today).startOf("day");
  const nextWeek = todayDate.add(7, "day");

  const groups: GroupedTasks = {
    overdue: [],
    dueToday: [],
    startingToday: [],
    inProgress: [],
    dueThisWeek: [],
    notStarted: [],
    future: [],
    completed: [],
  };

  for (const task of tasks) {
    const dueDate = task.dueDate ? dayjs(task.dueDate) : null;
    const startDate = task.startDate ? dayjs(task.startDate) : null;

    // Handle completed tasks
    if (task.doneDate) {
      if (options.completedInTheirCategories) {
        if (dueDate?.isSame(todayDate, "day")) {
          groups.dueToday.push(task);
          continue;
        }
        if (startDate?.isSame(todayDate, "day")) {
          groups.startingToday.push(task);
          continue;
        }
      }
      if (options.showCompleted) {
        groups.completed.push(task);
      }
      continue;
    }

    // Categorize non-completed tasks
    if (dueDate?.isBefore(todayDate)) {
      groups.overdue.push(task);
    } else if (dueDate?.isSame(todayDate, "day")) {
      groups.dueToday.push(task);
    } else if (
      startDate?.isSame(todayDate, "day") &&
      (!dueDate || dueDate.isAfter(todayDate))
    ) {
      groups.startingToday.push(task);
    } else if (
      startDate?.isBefore(todayDate) &&
      (!dueDate || dueDate.isAfter(todayDate))
    ) {
      groups.inProgress.push(task);
    } else if (
      dueDate?.isAfter(todayDate) &&
      dueDate.isBefore(nextWeek)
    ) {
      groups.dueThisWeek.push(task);
    } else if (startDate?.isAfter(todayDate)) {
      groups.notStarted.push(task);
    } else if (options.showFuture) {
      groups.future.push(task);
    } else {
      // startDate/dueDateが未設定のタスクは「進行中」に分類
      groups.inProgress.push(task);
    }
  }

  // Sort each group by due date, then start date
  for (const key of Object.keys(groups) as (keyof GroupedTasks)[]) {
    groups[key].sort((a, b) => {
      const dateA = a.dueDate || a.startDate;
      const dateB = b.dueDate || b.startDate;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.localeCompare(dateB);
    });
  }

  return groups;
}
