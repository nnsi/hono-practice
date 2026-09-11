import { useTranslation } from "@packages/i18n";
import { Text, View } from "react-native";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { TaskScheduleEditDialog } from "./TaskScheduleEditDialog";
import { TaskScheduleRow } from "./TaskScheduleRow";
import { useTaskSchedulesTab } from "./useTaskSchedulesTab";

/** 「繰り返し」タブ: スケジュールの一覧 / 編集 / 一時停止・再開 / 削除 */
export function TaskSchedulesTab() {
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
    <View>
      {schedules.length === 0 ? (
        <View className="items-center py-12 px-4">
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {t("page.empty.schedules")}
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {schedules.map((schedule) => (
            <TaskScheduleRow
              key={schedule.id}
              schedule={schedule}
              onEdit={() => setEditingSchedule(schedule)}
              onToggleActive={() => handleToggleActive(schedule)}
              onDelete={() => setDeleteConfirmId(schedule.id)}
            />
          ))}
        </View>
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
    </View>
  );
}
