import { useTranslation } from "@packages/i18n";

import { TaskGroup } from "./TaskGroup";
import type { TaskGroupHandlers } from "./TasksPageViewTypes";
import type { TaskItem } from "./types";

type Props = TaskGroupHandlers & {
  archivedTasks: TaskItem[];
};

export function TasksArchivedSection({
  archivedTasks,
  onToggleDone,
  onEdit,
  onDelete,
  onArchive,
  onMoveToToday,
}: Props) {
  const { t } = useTranslation("task");

  if (archivedTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t("page.empty.archived")}</p>
      </div>
    );
  }

  return (
    <TaskGroup
      title={t("page.tab.archived")}
      tasks={archivedTasks}
      titleColor="text-gray-500"
      archived
      onToggleDone={onToggleDone}
      onEdit={onEdit}
      onDelete={onDelete}
      onArchive={onArchive}
      onMoveToToday={onMoveToToday}
    />
  );
}
