import { useTranslation } from "@packages/i18n";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

import { TaskGroup } from "./TaskGroup";
import type { TaskGroupHandlers } from "./TasksPageViewTypes";
import type { GroupedTasks } from "./types";

type Props = TaskGroupHandlers & {
  groupedTasks: GroupedTasks;
  futureCount: number;
  completedCount: number;
  hasAnyTasks: boolean;
  showFuture: boolean;
  showCompleted: boolean;
  onToggleFuture: (show: boolean) => void;
  onToggleCompleted: (show: boolean) => void;
  onOpenCreate: () => void;
};

type PrimaryGroupConfig = {
  key: "overdue" | "dueToday" | "startingToday" | "inProgress" | "dueThisWeek";
  titleKey:
    | "page.group.overdue"
    | "page.group.dueToday"
    | "page.group.startingToday"
    | "page.group.inProgress"
    | "page.group.dueThisWeek";
  titleColor: string;
  highlight?: boolean;
};

const PRIMARY_GROUPS: PrimaryGroupConfig[] = [
  {
    key: "overdue",
    titleKey: "page.group.overdue",
    titleColor: "text-red-600",
    highlight: true,
  },
  {
    key: "dueToday",
    titleKey: "page.group.dueToday",
    titleColor: "text-orange-600",
  },
  {
    key: "startingToday",
    titleKey: "page.group.startingToday",
    titleColor: "text-blue-600",
  },
  {
    key: "inProgress",
    titleKey: "page.group.inProgress",
    titleColor: "text-green-600",
  },
  {
    key: "dueThisWeek",
    titleKey: "page.group.dueThisWeek",
    titleColor: "text-gray-700",
  },
];

export function TasksActiveSection({
  groupedTasks,
  futureCount,
  completedCount,
  hasAnyTasks,
  showFuture,
  showCompleted,
  onToggleFuture,
  onToggleCompleted,
  onOpenCreate,
  onToggleDone,
  onEdit,
  onDelete,
  onArchive,
  onMoveToToday,
}: Props) {
  const { t } = useTranslation("task");

  return (
    <div className="space-y-6">
      {!hasAnyTasks && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">{t("page.empty")}</p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            {t("page.firstTask")}
          </button>
        </div>
      )}

      {PRIMARY_GROUPS.map(({ key, titleKey, titleColor, highlight }) => (
        <TaskGroup
          key={key}
          title={t(titleKey)}
          tasks={groupedTasks[key]}
          titleColor={titleColor}
          highlight={highlight}
          onToggleDone={onToggleDone}
          onEdit={onEdit}
          onDelete={onDelete}
          onArchive={onArchive}
          onMoveToToday={onMoveToToday}
        />
      ))}

      {futureCount > 0 && (
        <div>
          <button
            type="button"
            onClick={() => onToggleFuture(!showFuture)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showFuture ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            {showFuture
              ? t("page.toggle.futureHide")
              : t("page.toggle.futureShow", { count: futureCount })}
          </button>
          {showFuture && (
            <div className="mt-3 space-y-6">
              <TaskGroup
                title={t("page.group.notStarted")}
                tasks={groupedTasks.notStarted}
                titleColor="text-purple-600"
                onToggleDone={onToggleDone}
                onEdit={onEdit}
                onDelete={onDelete}
                onArchive={onArchive}
              />
              <TaskGroup
                title={t("page.group.future")}
                tasks={groupedTasks.future}
                titleColor="text-indigo-600"
                onToggleDone={onToggleDone}
                onEdit={onEdit}
                onDelete={onDelete}
                onArchive={onArchive}
              />
            </div>
          )}
        </div>
      )}

      {completedCount > 0 && (
        <div>
          <button
            type="button"
            onClick={() => onToggleCompleted(!showCompleted)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showCompleted ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            {showCompleted
              ? t("page.toggle.completedHide")
              : t("page.toggle.completedShow", { count: completedCount })}
          </button>
          {showCompleted && (
            <div className="mt-3">
              <TaskGroup
                title={t("page.group.completed")}
                tasks={groupedTasks.completed}
                titleColor="text-gray-500"
                completed
                onToggleDone={onToggleDone}
                onEdit={onEdit}
                onDelete={onDelete}
                onArchive={onArchive}
              />
            </div>
          )}
        </div>
      )}

      {hasAnyTasks && (
        <button
          type="button"
          onClick={onOpenCreate}
          className="w-full py-5 border-2 border-dashed border-gray-300 rounded-xl bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <Plus size={18} className="text-gray-400 group-hover:text-gray-600" />
          <span className="text-sm text-gray-500 group-hover:text-gray-700">
            {t("page.addNew")}
          </span>
        </button>
      )}
    </div>
  );
}
