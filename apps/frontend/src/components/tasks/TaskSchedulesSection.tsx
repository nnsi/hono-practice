import { useTranslation } from "@packages/i18n";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { TaskScheduleEditDialog } from "./TaskScheduleEditDialog";
import { TaskScheduleRow } from "./TaskScheduleRow";
import { useTaskSchedulesTab } from "./useTaskSchedulesTab";

/** 「繰り返し」タブ: スケジュールの一覧 / 編集 / 一時停止・再開 / 削除 */
export function TaskSchedulesSection() {
  const { t } = useTranslation("task");
  const {
    schedules,
    editingSchedule,
    setEditingSchedule,
    deleteConfirmId,
    setDeleteConfirmId,
    deleteTarget,
    handleToggleActive,
    handleDelete,
    handleEditSuccess,
  } = useTaskSchedulesTab();

  return (
    <>
      {schedules.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">{t("page.empty.schedules")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <TaskScheduleRow
              key={schedule.id}
              schedule={schedule}
              onEdit={() => setEditingSchedule(schedule)}
              onToggleActive={() => handleToggleActive(schedule)}
              onDelete={() => setDeleteConfirmId(schedule.id)}
            />
          ))}
        </div>
      )}

      {editingSchedule && (
        <TaskScheduleEditDialog
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deleteConfirmId && (
        <DeleteConfirmDialog
          taskTitle={deleteTarget?.title ?? ""}
          variant="schedule"
          onConfirm={() => handleDelete(deleteConfirmId)}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </>
  );
}
